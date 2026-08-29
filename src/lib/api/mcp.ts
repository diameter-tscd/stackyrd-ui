import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';
import { mcpInstanceId } from '$lib/stores/data';
import type { ApiResponse, MCPToolResult } from '$lib/types/api';

interface JSONRPCRequest {
	jsonrpc: '2.0';
	id: number | string;
	method: string;
	params?: Record<string, unknown>;
}

interface JSONRPCResponse {
	jsonrpc: '2.0';
	id: number | string | null;
	result?: unknown;
	error?: { code: number; message: string };
}

export function resolveMcpUrl(endpoint?: string): string {
	if (endpoint) return endpoint;
	if (browser) {
		try {
			const stored = localStorage.getItem('stackyrd_auth');
			if (stored) {
				const parsed = JSON.parse(stored) as { mcpUrl?: string };
				if (parsed.mcpUrl) {
					if (parsed.mcpUrl.includes('localhost:8080') || parsed.mcpUrl.includes('127.0.0.1:8080')) return '/mcp';
					return parsed.mcpUrl;
				}
			}
		} catch {}
		return '/mcp';
	}
	return env.PUBLIC_MCP_URL || 'http://localhost:8080/mcp';
}

export async function mcpCall(
	token: string | null,
	method: string,
	params?: Record<string, unknown>,
	endpoint?: string
): Promise<unknown> {
	const url = resolveMcpUrl(endpoint);

	const mcpVersion = '2026-07-28';
	const bodyParams: Record<string, unknown> = {
		...(params ?? {}),
		_meta: {
			...((params as Record<string, unknown>)?._meta as Record<string, unknown> ?? {}),
			'io.modelcontextprotocol/protocolVersion': mcpVersion
		}
	};

	const body: JSONRPCRequest = {
		jsonrpc: '2.0',
		id: Date.now(),
		method,
		params: bodyParams
	};

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json, text/event-stream',
		'MCP-Protocol-Version': mcpVersion,
		'Mcp-Method': method
	};
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}
	if (method === 'tools/call' && params && typeof (params as Record<string, unknown>).name === 'string') {
		const name = (params as Record<string, unknown>).name as string;
		headers['Mcp-Name'] = name.includes(' ') || /[^\x20-\x7E]/.test(name) ? `=?base64?${btoa(name)}?=` : name;
	}

	const response = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});

	try {
		const iid = response.headers.get('X-MCP-Instance-ID') || response.headers.get('x-mcp-instance-id');
		if (iid) mcpInstanceId.set(iid);
	} catch {}

	const rawText = await response.text();
	const contentType = response.headers.get('content-type') || '';
	const isSse = contentType.includes('text/event-stream') || rawText.includes('event:') && rawText.includes('data:');
	let jsonText = rawText;
	if (isSse) {
		const lines = rawText.split('\n');
		const dataLines = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
		jsonText = dataLines.join('\n') || rawText;
		const errorMatch = rawText.match(/data:\s*(\{"error":.*\})/);
		if (errorMatch && !jsonText.trim().startsWith('{')) jsonText = errorMatch[1];
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonText || rawText);
	} catch {
		throw new Error(`MCP endpoint returned non-JSON response (HTTP ${response.status}): ${rawText.slice(0, 200)}`);
	}
	if (Array.isArray(parsed)) {
		const batch = parsed as JSONRPCResponse[];
		const single = batch.find((r) => r.id === body.id) ?? batch[0];
		if (single) {
			if (!response.ok) throw new Error(single.error?.message ?? `MCP batch failed ${response.status}`);
			if (single.error) throw new Error(single.error.message);
			return single.result;
		}
		throw new Error('MCP batch returned no matching response');
	}
	const data = parsed as JSONRPCResponse;

	if (!response.ok) {
		const msg = data.error?.message ?? jsonText.slice(0, 200) ?? `MCP request failed with HTTP ${response.status}`;
		if (response.status === 405 && msg.includes('GET not supported')) {
			throw new Error(
				'MCP endpoint rejected GET — ensure client uses POST with Content-Type: application/json and MCP-Protocol-Version header. Check vite proxy /mcp → POST only.'
			);
		}
		throw new Error(msg);
	}

	if (data.error) {
		throw new Error(data.error.message);
	}

	return data.result;
}

export async function mcpListTools(token: string | null): Promise<
	Array<{
		name: string;
		description: string;
		inputSchema: Record<string, unknown>;
	}>
> {
	const result = (await mcpCall(token, 'tools/list')) as {
		tools: Array<{
			name: string;
			description: string;
			inputSchema: Record<string, unknown>;
		}>;
	};
	return result.tools;
}

export async function mcpCallTool(
	token: string | null,
	toolName: string,
	args?: Record<string, unknown>
): Promise<MCPToolResult> {
	const result = (await mcpCall(token, 'tools/call', {
		name: toolName,
		arguments: args ?? {}
	})) as MCPToolResult;
	return result;
}

export function parseMCPResult(result: MCPToolResult): string {
	return result.content
		.map((c) => {
			if (c.type === 'text') return c.text;
			return JSON.stringify(c);
		})
		.join('\n');
}

export async function mcpToolsCall(
	token: string | null,
	toolName: string,
	args?: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
	const result = await mcpCallTool(token, toolName, args);
	const text = parseMCPResult(result);
	try {
		const parsed = JSON.parse(text) as unknown;
		if (parsed && typeof parsed === 'object' && 'success' in (parsed as Record<string, unknown>) && 'data' in (parsed as Record<string, unknown>)) {
			return parsed as ApiResponse<unknown>;
		}
		return {
			success: !result.isError,
			status: result.isError ? 500 : 200,
			message: result.isError ? 'MCP tool error' : 'OK',
			data: parsed,
			error: result.isError ? text : null,
			meta: null,
			timestamp: new Date().toISOString(),
			datetime: new Date().toISOString(),
			correlation_id: ''
		};
	} catch {
		return {
			success: !result.isError,
			status: result.isError ? 500 : 200,
			message: result.isError ? 'MCP tool error' : 'OK',
			data: text,
			error: result.isError ? text : null,
			meta: null,
			timestamp: new Date().toISOString(),
			datetime: new Date().toISOString(),
			correlation_id: ''
		};
	}
}
