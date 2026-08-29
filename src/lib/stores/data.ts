import { writable } from 'svelte/store';
import type { HealthData, ServiceMeta, InfraStatus, EndpointList } from '$lib/types/api';

export const health = writable<HealthData | null>(null);
export const services = writable<ServiceMeta[]>([]);
export const infra = writable<InfraStatus[]>([]);
export const endpoints = writable<EndpointList | null>(null);
export const connectionStatus = writable<'connected' | 'disconnected' | 'checking'>('checking');
