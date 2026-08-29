export interface ApiResponse<T = unknown> {
	success: boolean;
	status: number;
	message: string;
	data: T;
	error: string | null;
	meta: Record<string, unknown> | null;
	timestamp: string;
	datetime: string;
	correlation_id: string;
}

export interface HealthData {
	server_ready: boolean;
	status?: string;
	progress?: number;
	initialization_progress?: number;
	uptime?: string | number;
	uptime_seconds?: number;
	uptimeSeconds?: number;
	started_at?: string;
	start_time?: string;
	boot_time?: string;
	startedAt?: string;
	environment?: string;
	version?: string;
	services?: ServiceHealth[];
	infrastructure?: InfraHealth[] | Record<string, unknown>;
	[key: string]: unknown;
}

export interface ServiceHealth {
	name: string;
	wire_name: string;
	enabled: boolean;
	status: 'running' | 'failed' | 'disabled' | 'initializing';
	endpoints_count: number;
}

export interface InfraHealth {
	name: string;
	status: 'connected' | 'disconnected' | 'error' | 'initializing';
	last_check: string;
	message: string;
}

export interface ServiceMeta {
	name: string;
	wire_name: string;
	enabled: boolean;
	status: 'running' | 'failed' | 'disabled' | 'initializing';
	endpoints: EndpointMeta[];
	dependencies: string[];
}

export interface EndpointMeta {
	method: string;
	path: string;
	description: string;
	service: string;
}

export interface InfraStatus {
	name: string;
	status: 'connected' | 'disconnected' | 'error' | 'initializing';
	type: string;
	last_check: string;
	details: InfraDetails;
}

export interface InfraDetails {
	host?: string;
	port?: number;
	database?: string;
	pool_size?: number;
	active_connections?: number;
	[key: string]: unknown;
}

export interface EndpointList {
	services: ServiceEndpointGroup[];
	total: number;
}

export interface ServiceEndpointGroup {
	service: string;
	endpoints: EndpointMeta[];
}

export interface MCPToolResult {
	content: MCPContent[];
	isError?: boolean;
}

export interface MCPContent {
	type: string;
	text: string;
}

export interface PrometheusMetric {
	name: string;
	help: string;
	type: 'counter' | 'gauge' | 'histogram' | 'summary';
	values: PrometheusValue[];
}

export interface PrometheusValue {
	labels: Record<string, string>;
	value: number;
}

export interface ConfigData {
	app: Record<string, unknown>;
	server: Record<string, unknown>;
	services: Record<string, boolean>;
	middleware: Record<string, boolean>;
	auth: Record<string, unknown>;
	redis: Record<string, unknown>;
	kafka: Record<string, unknown>;
	postgres: Record<string, unknown>;
	mongo: Record<string, unknown>;
	grafana: Record<string, unknown>;
	minio: Record<string, unknown>;
	cron: Record<string, unknown>;
}

export interface LogEntry {
	timestamp: string;
	level: 'debug' | 'info' | 'warn' | 'error';
	message: string;
	source?: string;
	fields?: Record<string, string>;
}

export interface UptimeData {
	uptime: string;
	uptime_seconds: number;
	started_at: string;
	started_at_unix: number;
}

export interface ResourceData {
	cpu_percent: number;
	mem_percent: number;
	mem_used_mib: number;
	mem_total_mib: number;
	cores: number;
	goroutines: number;
	app_mem_mib: number;
	hostname: string;
	cpu_model: string;
	pid: number;
}

export interface InstanceIdentity {
	instance_id: string;
	pod_name: string;
	pod_ip: string;
	namespace: string;
	node_name: string;
	hostname: string;
	pid: number;
	started_at: string;
}

export type ThemePreset = 'dark' | 'midnight' | 'terminal' | 'slate' | 'ember';
