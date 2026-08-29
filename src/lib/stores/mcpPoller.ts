import { get } from 'svelte/store';
import { auth } from '$lib/stores/auth';
import { health, services, infra, endpoints, mcpUptime, resources, instanceIdentity, memory, connectionStatus, mcpInstanceId, goroutineDump, goroutineHistory } from '$lib/stores/data';
import { resolveMcpUrl } from '$lib/api/mcp';
import type { ApiResponse, EndpointMeta, EndpointList, ServiceMeta, InfraStatus, UptimeData, ResourceData, InstanceIdentity, MemoryData, HealthData, GoroutineDump, GoroutineDataPoint } from '$lib/types/api';

let polling: ReturnType<typeof setInterval> | null = null;
let goroutinePolling: ReturnType<typeof setInterval> | null = null;
let uptimeFetchedAt: number | null = null;

const INTERVAL = 3000;
const GOROUTINE_INTERVAL = 10000;
const MAX_GOROUTINE_HISTORY = 120;

interface JSONRPCRequest {
	jsonrpc: '2.0';
	id: number;
	method: string;
	params: Record<string, unknown>;
}

interface JSONRPCResponse {
	jsonrpc: '2.0';
	id: number | null;
	result?: unknown;
	error?: { code: number; message: string };
}

function buildBatch(): JSONRPCRequest[] {
	const tools = [
		'stackyrd_health',
		'stackyrd_services',
		'stackyrd_infra',
		'stackyrd_endpoints',
		'stackyrd_uptime',
		'stackyrd_resources',
		'stackyrd_identity',
		'stackyrd_memory'
	];
	const mcpVersion = '2026-07-28';
	const baseId = Date.now();
	return tools.map((name, i) => ({
		jsonrpc: '2.0',
		id: baseId + i,
		method: 'tools/call',
		params: {
			name,
			arguments: {},
			_meta: { 'io.modelcontextprotocol/protocolVersion': mcpVersion }
		}
	}));
}

function normalizeServices(raw: unknown): ServiceMeta[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((r: unknown) => {
		const o = r as Record<string, unknown>;
		const endpointsRaw = (o.endpoints as string[]) ?? [];
		const eps: EndpointMeta[] = endpointsRaw.map((p) => ({ method: 'GET', path: p as string, description: '', service: (o.name as string) ?? '' }));
		const state = (o.state as string) ?? (o.status as string) ?? 'running';
		return { name: (o.name as string) ?? '', wire_name: (o.wire_name as string) ?? (o.wireName as string) ?? '', enabled: true, status: (state === '' ? 'running' : state) as ServiceMeta['status'], endpoints: eps, dependencies: (o.dependencies as string[]) ?? [] };
	});
}

function normalizeInfra(raw: unknown): InfraStatus[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((r: unknown) => {
		const o = r as Record<string, unknown>;
		const statusObj = (o.status as Record<string, unknown>) ?? {};
		const connected = statusObj.connected === true || statusObj.initialized === true;
		const statusStr = connected ? 'connected' : (statusObj.error ? 'error' : 'disconnected');
		return { name: (o.name as string) ?? '', status: statusStr as InfraStatus['status'], type: (o.type as string) ?? (o.name as string) ?? '', last_check: (statusObj.last_run as string) ?? (statusObj.last_check as string) ?? '', details: statusObj as InfraStatus['details'] };
	});
}

function normalizeEndpoints(raw: unknown): EndpointList {
	if (Array.isArray(raw)) {
		const eps: EndpointMeta[] = (raw as string[]).map((p) => ({ method: 'GET', path: p, description: '', service: 'stackyrd' }));
		return { total: eps.length, services: [{ service: 'stackyrd', endpoints: eps }] };
	}
	if (raw && typeof raw === 'object' && 'services' in (raw as Record<string, unknown>)) {
		return raw as EndpointList;
	}
	return { total: 0, services: [] };
}

function parseMCPResult(result: unknown): unknown {
	if (!result || typeof result !== 'object') return null;
	const r = result as Record<string, unknown>;
	if (!Array.isArray(r.content)) return null;
	const text = r.content.map((c) => { if ((c as Record<string, unknown>).type === 'text') return (c as Record<string, unknown>).text as string; return JSON.stringify(c); }).join('\n');
	try {
		const parsed = JSON.parse(text);
		if (parsed && typeof parsed === 'object' && 'success' in parsed && 'data' in parsed) return (parsed as ApiResponse<unknown>).data;
		return parsed;
	} catch {
		return text;
	}
}

async function pollAll() {
	const token = get(auth).token;
	const url = resolveMcpUrl();
	const batch = buildBatch();
	const mcpVersion = '2026-07-28';

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'Accept': 'application/json, text/event-stream',
		'MCP-Protocol-Version': mcpVersion,
		'Mcp-Method': 'tools/call'
	};
	if (token) headers['Authorization'] = `Bearer ${token}`;

	const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(batch) });

	try {
		const iid = response.headers.get('X-MCP-Instance-ID') || response.headers.get('x-mcp-instance-id');
		if (iid) mcpInstanceId.set(iid);
	} catch {}

	const rawText = await response.text();
	const contentType = response.headers.get('content-type') || '';
	const isSse = contentType.includes('text/event-stream') || (rawText.includes('event:') && rawText.includes('data:'));

	let responses: JSONRPCResponse[] = [];

	if (isSse) {
		const lines = rawText.split('\n');
		for (const line of lines) {
			if (!line.startsWith('data:')) continue;
			const jsonStr = line.slice(5).trim();
			if (!jsonStr) continue;
			try {
				responses.push(JSON.parse(jsonStr) as JSONRPCResponse);
			} catch {
				// skip malformed line
			}
		}
	} else {
		let parsed: unknown;
		try {
			parsed = JSON.parse(rawText);
		} catch {
			connectionStatus.set('disconnected');
			return;
		}
		if (Array.isArray(parsed)) {
			responses = parsed as JSONRPCResponse[];
		} else if (parsed && typeof parsed === 'object') {
			responses = [parsed as JSONRPCResponse];
		}
	}

	if (responses.length === 0) {
		connectionStatus.set('disconnected');
		return;
	}

	let hasSuccess = false;

	responses.forEach((resp, i) => {
		if (resp.error || !resp.result) return;
		const data = parseMCPResult(resp.result);
		if (data === null || data === undefined) return;

		switch (i) {
			case 0: health.set(data as HealthData); break;
			case 1: services.set(normalizeServices(data)); break;
			case 2: infra.set(normalizeInfra(data)); break;
			case 3: endpoints.set(normalizeEndpoints(data)); break;
			case 4: mcpUptime.set(data as UptimeData); uptimeFetchedAt = Date.now(); break;
			case 5: resources.set(data as ResourceData); break;
			case 6: instanceIdentity.set(data as InstanceIdentity); break;
			case 7: memory.set(data as MemoryData); break;
			default: return;
		}
		hasSuccess = true;
	});

	connectionStatus.set(hasSuccess ? 'connected' : 'disconnected');
}

async function pollGoroutines() {
	const token = get(auth).token;
	if (!token) return;
	const url = resolveMcpUrl();
	const mcpVersion = '2026-07-28';

	const body: JSONRPCRequest = {
		jsonrpc: '2.0',
		id: Date.now(),
		method: 'tools/call',
		params: {
			name: 'stackyrd_goroutines',
			arguments: {},
			_meta: { 'io.modelcontextprotocol/protocolVersion': mcpVersion }
		}
	};

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'Accept': 'application/json, text/event-stream',
		'MCP-Protocol-Version': mcpVersion,
		'Mcp-Method': 'tools/call'
	};
	headers['Authorization'] = `Bearer ${token}`;

	const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

	try {
		const iid = response.headers.get('X-MCP-Instance-ID') || response.headers.get('x-mcp-instance-id');
		if (iid) mcpInstanceId.set(iid);
	} catch {}

	const rawText = await response.text();
	const contentType = response.headers.get('content-type') || '';
	const isSse = contentType.includes('text/event-stream') || (rawText.includes('event:') && rawText.includes('data:'));

	let jsonText = rawText;
	if (isSse) {
		const lines = rawText.split('\n');
		const dataLines = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
		jsonText = dataLines.join('\n') || rawText;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonText || rawText);
	} catch {
		return;
	}

	const resp = parsed as JSONRPCResponse;
	if (resp.error || !resp.result) return;
	const data = parseMCPResult(resp.result) as GoroutineDump | null;
	if (!data) return;

	goroutineDump.set(data);
	const point: GoroutineDataPoint = { timestamp: Date.now(), count: data.count, states: data.states };
	const current = get(goroutineHistory);
	goroutineHistory.set([...current, point].slice(-MAX_GOROUTINE_HISTORY));
}

export const mcpPoller = {
	start() {
		if (polling) return;
		pollAll();
		polling = setInterval(pollAll, INTERVAL);
	},
	startGoroutinePolling() {
		if (goroutinePolling) return;
		pollGoroutines();
		goroutinePolling = setInterval(pollGoroutines, GOROUTINE_INTERVAL);
	},
	async refreshGoroutines() {
		await pollGoroutines();
	},
	stop() {
		if (polling) {
			clearInterval(polling);
			polling = null;
		}
		if (goroutinePolling) {
			clearInterval(goroutinePolling);
			goroutinePolling = null;
		}
	},
	get uptimeFetchedAt() {
		return uptimeFetchedAt;
	}
};
