import { apiFetch } from '$lib/api/rest';
import { mcpToolsCall } from '$lib/api/mcp';
import { env } from '$env/dynamic/public';

const PUBLIC_API_TOKEN = env.PUBLIC_API_TOKEN || '';
import type {
	ApiResponse,
	HealthData,
	ServiceMeta,
	InfraStatus,
	EndpointList,
	ConfigData,
	EndpointMeta,
	UptimeData,
	ResourceData,
	InstanceIdentity,
	MemoryData,
	GoroutineDump
} from '$lib/types/api';

function effToken(token: string | null): string | null {
	if (token) return token;
	if (PUBLIC_API_TOKEN) return PUBLIC_API_TOKEN;
	return null;
}

export async function getHealth(token: string | null): Promise<ApiResponse<HealthData>> {
	return apiFetch<ApiResponse<HealthData>>('/health', effToken(token));
}

export async function getDependencies(token: string | null): Promise<ApiResponse<unknown>> {
	return apiFetch<ApiResponse<unknown>>('/health/dependencies', effToken(token));
}

export async function getMetrics(token: string | null): Promise<string> {
	const t = effToken(token);
	const response = await fetch('/metrics', {
		headers: t ? { Authorization: `Bearer ${t}` } : {}
	});
	const text = await response.text();
	if (!response.ok) {
		const { ApiError } = await import('$lib/api/rest');
		throw new ApiError(text || response.statusText, response.status, text);
	}
	return text;
}

export async function getMCPHealth(token: string | null): Promise<ApiResponse<unknown>> {
	return mcpToolsCall(effToken(token), 'stackyrd_health');
}

export async function getMCPUpTime(token: string | null): Promise<ApiResponse<UptimeData>> {
	return mcpToolsCall(effToken(token), 'stackyrd_uptime') as Promise<ApiResponse<UptimeData>>;
}

export async function getMCPResources(token: string | null): Promise<ApiResponse<ResourceData>> {
	return mcpToolsCall(effToken(token), 'stackyrd_resources') as Promise<ApiResponse<ResourceData>>;
}

export async function getMCPMiddleware(token: string | null): Promise<ApiResponse<Array<{ name: string; enabled: boolean }>>> {
	return mcpToolsCall(effToken(token), 'stackyrd_middleware') as Promise<ApiResponse<Array<{ name: string; enabled: boolean }>>>;
}

export async function getMCPDashboard(token: string | null): Promise<ApiResponse<unknown>> {
	return mcpToolsCall(effToken(token), 'stackyrd_dashboard');
}

export async function getMCPApp(token: string | null): Promise<ApiResponse<unknown>> {
	return mcpToolsCall(effToken(token), 'stackyrd_app');
}

export async function getMCPIdentity(token: string | null): Promise<ApiResponse<InstanceIdentity>> {
	return mcpToolsCall(effToken(token), 'stackyrd_identity') as Promise<ApiResponse<InstanceIdentity>>;
}

export async function getMCPMemory(token: string | null): Promise<ApiResponse<MemoryData>> {
	return mcpToolsCall(effToken(token), 'stackyrd_memory') as Promise<ApiResponse<MemoryData>>;
}

export async function getMCPCluster(token: string | null): Promise<ApiResponse<{ members: InstanceIdentity[] }>> {
	return mcpToolsCall(effToken(token), 'stackyrd_cluster') as Promise<ApiResponse<{ members: InstanceIdentity[] }>>;
}

export async function getMCPGoroutines(token: string | null): Promise<ApiResponse<GoroutineDump>> {
	return mcpToolsCall(effToken(token), 'stackyrd_goroutines') as Promise<ApiResponse<GoroutineDump>>;
}

export async function getMCPServices(token: string | null): Promise<ApiResponse<ServiceMeta[]>> {
	const res = (await mcpToolsCall(effToken(token), 'stackyrd_services')) as ApiResponse<unknown>;
	const raw = res.data as unknown[];
	if (!Array.isArray(raw)) return res as ApiResponse<ServiceMeta[]>;
	const normalized: ServiceMeta[] = raw.map((r: unknown) => {
		const o = r as Record<string, unknown>;
		const endpointsRaw = (o.endpoints as string[]) ?? [];
		const endpoints: EndpointMeta[] = endpointsRaw.map((p) => ({
			method: 'GET',
			path: p as string,
			description: '',
			service: (o.name as string) ?? ''
		}));
		const state = (o.state as string) ?? (o.status as string) ?? 'running';
		return {
			name: (o.name as string) ?? '',
			wire_name: (o.wire_name as string) ?? (o.wireName as string) ?? '',
			enabled: true,
			status: (state === '' ? 'running' : state) as ServiceMeta['status'],
			endpoints,
			dependencies: (o.dependencies as string[]) ?? []
		};
	});
	return { ...res, data: normalized } as ApiResponse<ServiceMeta[]>;
}

export async function getMCPInfra(token: string | null): Promise<ApiResponse<InfraStatus[]>> {
	const res = (await mcpToolsCall(effToken(token), 'stackyrd_infra')) as ApiResponse<unknown>;
	const raw = res.data as unknown[];
	if (!Array.isArray(raw)) return res as ApiResponse<InfraStatus[]>;
	const normalized: InfraStatus[] = raw.map((r: unknown) => {
		const o = r as Record<string, unknown>;
		const statusObj = (o.status as Record<string, unknown>) ?? {};
		const connected = statusObj.connected === true || statusObj.initialized === true;
		const statusStr = connected ? 'connected' : (statusObj.error ? 'error' : 'disconnected');
		return {
			name: (o.name as string) ?? '',
			status: statusStr as InfraStatus['status'],
			type: (o.type as string) ?? (o.name as string) ?? '',
			last_check: (statusObj.last_run as string) ?? (statusObj.last_check as string) ?? '',
			details: statusObj as InfraStatus['details']
		};
	});
	return { ...res, data: normalized } as ApiResponse<InfraStatus[]>;
}

export async function getMCPInfraDetail(
	token: string | null,
	name: string
): Promise<ApiResponse<InfraStatus>> {
	const res = (await mcpToolsCall(effToken(token), 'stackyrd_infra_detail', { name })) as ApiResponse<unknown>;
	const data = res.data as Record<string, unknown> | null;
	if (!data || typeof data !== 'object' || Array.isArray(data)) return res as ApiResponse<InfraStatus>;
	if ('name' in data && 'status' in data) return res as ApiResponse<InfraStatus>;
	return {
		...res,
		data: {
			name,
			status: 'connected',
			type: name,
			last_check: '',
			details: data as InfraStatus['details']
		}
	} as ApiResponse<InfraStatus>;
}

export async function getMCPEndpoints(token: string | null): Promise<ApiResponse<EndpointList>> {
	const res = (await mcpToolsCall(effToken(token), 'stackyrd_endpoints')) as ApiResponse<unknown>;
	const raw = res.data;
	if (Array.isArray(raw)) {
		const endpoints: EndpointMeta[] = (raw as string[]).map((p) => ({
			method: p.startsWith('/events') ? 'GET' : 'GET',
			path: p,
			description: '',
			service: 'stackyrd'
		}));
		const grouped: EndpointList = {
			total: endpoints.length,
			services: [{ service: 'stackyrd', endpoints }]
		};
		return { ...res, data: grouped } as ApiResponse<EndpointList>;
	}
	if (raw && typeof raw === 'object' && 'services' in (raw as Record<string, unknown>)) {
		return res as ApiResponse<EndpointList>;
	}
	return res as ApiResponse<EndpointList>;
}

export async function getConfig(token: string | null): Promise<ApiResponse<ConfigData>> {
	return apiFetch<ApiResponse<ConfigData>>('/api/v1/config', effToken(token));
}

export async function saveTheme(
	token: string | null,
	name: string
): Promise<ApiResponse<unknown>> {
	return apiFetch<ApiResponse<unknown>>('/api/v1/config/theme', effToken(token), {
		method: 'POST',
		body: { name }
	});
}
