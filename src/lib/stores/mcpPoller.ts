import { get } from 'svelte/store';
import { auth } from '$lib/stores/auth';
import { health, services, infra, endpoints, mcpUptime, resources, instanceIdentity, memory, connectionStatus, mcpInstanceId, goroutineDump, goroutineHistory } from '$lib/stores/data';
import { resolveMcpUrl } from '$lib/api/mcp';
import type { ApiResponse, EndpointMeta, EndpointList, ServiceMeta, InfraStatus, UptimeData, ResourceData, InstanceIdentity, MemoryData, HealthData, GoroutineDump, GoroutineDataPoint } from '$lib/types/api';

let polling: ReturnType<typeof setInterval> | null = null;
let goroutinePolling: ReturnType<typeof setInterval> | null = null;
let uptimeFetchedAt: number | null = null;
let visibilityHandler: (() => void) | null = null;
let consecutiveFails = 0;
let isPolling = false;
let slowPollTimer: ReturnType<typeof setInterval> | null = null;

const FAST_INTERVAL = 10000;
const SLOW_INTERVAL = 30000;
const GOROUTINE_INTERVAL = 10000;
const MAX_GOROUTINE_HISTORY = 120;
const BACKOFF_BASE = 2000;
const BACKOFF_MAX = 30000;

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

const FAST_TOOLS = ['stackyrd_health', 'stackyrd_services', 'stackyrd_infra', 'stackyrd_uptime'];
const SLOW_TOOLS = ['stackyrd_endpoints', 'stackyrd_resources', 'stackyrd_identity', 'stackyrd_memory'];

function buildBatch(tools: string[]): JSONRPCRequest[] {
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

async function fetchBatch(tools: string[]): Promise<{ responses: JSONRPCResponse[]; hasSuccess: boolean }> {
	const token = get(auth).token;
	if (!token) return { responses: [], hasSuccess: false };
	if (typeof document !== 'undefined' && document.hidden) return { responses: [], hasSuccess: false };
	const url = resolveMcpUrl();
	const batch = buildBatch(tools);
	const idToTool = new Map<number, string>();
	batch.forEach((b) => idToTool.set(b.id as number, b.params.name as string));
	const mcpVersion = '2026-07-28';
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json, text/event-stream',
		'MCP-Protocol-Version': mcpVersion,
		'Mcp-Method': 'tools/call'
	};
	if (token) headers['Authorization'] = `Bearer ${token}`;
	let response: Response;
	try {
		response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(batch) });
	} catch {
		return { responses: [], hasSuccess: false };
	}
	try {
		const iid = response.headers.get('X-MCP-Instance-ID') || response.headers.get('x-mcp-instance-id');
		if (iid) mcpInstanceId.set(iid);
	} catch {}
	const rawText = await response.text();
	const contentType = response.headers.get('content-type') || '';
	const isSse = contentType.includes('text/event-stream') || (rawText.includes('event:') && rawText.includes('data:'));
	let responses: JSONRPCResponse[] = [];
	if (isSse) {
		for (const line of rawText.split('\n')) {
			if (!line.startsWith('data:')) continue;
			const jsonStr = line.slice(5).trim();
			if (!jsonStr) continue;
			try { responses.push(JSON.parse(jsonStr) as JSONRPCResponse); } catch {}
		}
	} else {
		let parsed: unknown;
		try { parsed = JSON.parse(rawText); } catch { return { responses: [], hasSuccess: false }; }
		if (Array.isArray(parsed)) responses = parsed as JSONRPCResponse[];
		else if (parsed && typeof parsed === 'object') responses = [parsed as JSONRPCResponse];
	}
	if (responses.length === 0) return { responses: [], hasSuccess: false };
	let hasSuccess = false;
	const apply = (tool: string, data: unknown) => {
		switch (tool) {
			case 'stackyrd_health': health.set(data as HealthData); hasSuccess = true; break;
			case 'stackyrd_services': services.set(normalizeServices(data)); hasSuccess = true; break;
			case 'stackyrd_infra': infra.set(normalizeInfra(data)); hasSuccess = true; break;
			case 'stackyrd_uptime': mcpUptime.set(data as UptimeData); uptimeFetchedAt = Date.now(); hasSuccess = true; break;
			case 'stackyrd_endpoints': endpoints.set(normalizeEndpoints(data)); hasSuccess = true; break;
			case 'stackyrd_resources': resources.set(data as ResourceData); hasSuccess = true; break;
			case 'stackyrd_identity': instanceIdentity.set(data as InstanceIdentity); hasSuccess = true; break;
			case 'stackyrd_memory': memory.set(data as MemoryData); hasSuccess = true; break;
		}
	};
	responses.forEach((resp) => {
		if (resp.error || !resp.result) return;
		const data = parseMCPResult(resp.result);
		if (data == null) return;
		const tool = idToTool.get(resp.id as number) ?? tools[responses.indexOf(resp)] ?? '';
		if (tool) apply(tool, data);
		else {
			const idx = responses.indexOf(resp);
			if (idx >= 0 && idx < tools.length) apply(tools[idx], data);
		}
	});
	if (responses.length === 1 && tools.length === 1 && !hasSuccess) {
		const singleTool = tools[0];
		const r = responses[0];
		if (r && !r.error && r.result) {
			const d = parseMCPResult(r.result);
			if (d != null) apply(singleTool, d);
		}
	}
	return { responses, hasSuccess };
}

async function pollFast() {
	if (isPolling) return;
	isPolling = true;
	try {
		const { hasSuccess } = await fetchBatch(FAST_TOOLS);
		if (hasSuccess) {
			consecutiveFails = 0;
			connectionStatus.set('connected');
		} else {
			consecutiveFails++;
			if (consecutiveFails >= 3) connectionStatus.set('disconnected');
			scheduleBackoff();
		}
	} finally { isPolling = false; }
}

async function pollSlow() {
	if (typeof document !== 'undefined' && document.hidden) return;
	await fetchBatch(SLOW_TOOLS);
}

function scheduleBackoff() {
	if (consecutiveFails < 3) return;
	if (polling) { clearInterval(polling); polling = null; }
	const delay = Math.min(BACKOFF_BASE * Math.pow(2, consecutiveFails - 3), BACKOFF_MAX);
	setTimeout(() => {
		if (!polling && get(auth).authenticated) {
			consecutiveFails = 0;
			pollFast();
			polling = setInterval(pollFast, FAST_INTERVAL);
		}
	}, delay);
}

async function pollGoroutines() {
	const token = get(auth).token;
	if (!token) return;
	if (typeof document !== 'undefined' && document.hidden) return;
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
		Accept: 'application/json, text/event-stream',
		'MCP-Protocol-Version': mcpVersion,
		'Mcp-Method': 'tools/call',
		Authorization: `Bearer ${token}`
	};
	let response: Response;
	try { response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) }); } catch { return; }
	try {
		const iid = response.headers.get('X-MCP-Instance-ID') || response.headers.get('x-mcp-instance-id');
		if (iid) mcpInstanceId.set(iid);
	} catch {}
	const rawText = await response.text();
	const contentType = response.headers.get('content-type') || '';
	const isSse = contentType.includes('text/event-stream') || (rawText.includes('event:') && rawText.includes('data:'));
	let jsonText = rawText;
	if (isSse) {
		const dataLines = rawText.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
		jsonText = dataLines.join('\n') || rawText;
	}
	let parsed: unknown;
	try { parsed = JSON.parse(jsonText || rawText); } catch { return; }
	const resp = parsed as JSONRPCResponse;
	if (resp.error || !resp.result) return;
	const data = parseMCPResult(resp.result) as GoroutineDump | null;
	if (!data) return;
	goroutineDump.set(data);
	const point: GoroutineDataPoint = { timestamp: Date.now(), count: data.count, states: data.states };
	const current = get(goroutineHistory);
	if (current.length >= MAX_GOROUTINE_HISTORY) {
		current.shift();
		current.push(point);
		goroutineHistory.set(current);
	} else {
		goroutineHistory.set([...current, point]);
	}
}

export const mcpPoller = {
	start() {
		if (polling) return;
		consecutiveFails = 0;
		pollFast();
		pollSlow();
		polling = setInterval(pollFast, FAST_INTERVAL);
		slowPollTimer = setInterval(pollSlow, SLOW_INTERVAL);
		if (typeof document !== 'undefined' && !visibilityHandler) {
			visibilityHandler = () => {
				if (!document.hidden && get(auth).authenticated) {
					pollFast();
					pollSlow();
				}
			};
			document.addEventListener('visibilitychange', visibilityHandler);
			window.addEventListener('online', visibilityHandler);
		}
	},
	startGoroutinePolling() {
		if (goroutinePolling) return;
		pollGoroutines();
		goroutinePolling = setInterval(pollGoroutines, GOROUTINE_INTERVAL);
	},
	async refreshGoroutines() {
		await pollGoroutines();
	},
	async refreshResources() {
		await fetchBatch(['stackyrd_resources']);
	},
	async refreshMemory() {
		await fetchBatch(['stackyrd_memory']);
	},
	async refreshSlow() {
		await fetchBatch(SLOW_TOOLS);
	},
	stop() {
		if (polling) { clearInterval(polling); polling = null; }
		if (slowPollTimer) { clearInterval(slowPollTimer); slowPollTimer = null; }
		if (goroutinePolling) { clearInterval(goroutinePolling); goroutinePolling = null; }
		if (visibilityHandler && typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', visibilityHandler);
			window.removeEventListener('online', visibilityHandler);
			visibilityHandler = null;
		}
		consecutiveFails = 0;
		isPolling = false;
	},
	get uptimeFetchedAt() {
		return uptimeFetchedAt;
	}
};
