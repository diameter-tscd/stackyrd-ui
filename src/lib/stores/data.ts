import { writable } from 'svelte/store';
import type { HealthData, ServiceMeta, InfraStatus, EndpointList, UptimeData, ResourceData, InstanceIdentity, MemoryData, GoroutineDump, GoroutineDataPoint } from '$lib/types/api';

export const health = writable<HealthData | null>(null);
export const services = writable<ServiceMeta[]>([]);
export const infra = writable<InfraStatus[]>([]);
export const endpoints = writable<EndpointList | null>(null);
export const mcpUptime = writable<UptimeData | null>(null);
export const resources = writable<ResourceData | null>(null);
export const instanceIdentity = writable<InstanceIdentity | null>(null);
export const memory = writable<MemoryData | null>(null);
export const mcpInstanceId = writable<string | null>(null);
export const connectionStatus = writable<'connected' | 'disconnected' | 'checking'>('checking');
export const goroutineDump = writable<GoroutineDump | null>(null);
export const goroutineHistory = writable<GoroutineDataPoint[]>([]);
