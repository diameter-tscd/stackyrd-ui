import { writable, get } from 'svelte/store';
import { vaultExists, setup, unlock, lock, list, insert, update, remove, setLastUsed, type Connection } from '$lib/vault/vault';
import { auth } from '$lib/stores/auth';
import { mcpCall } from '$lib/api/mcp';
import { browser } from '$app/environment';

export interface ConnectionsState {
	connections: Connection[];
	activeId: string | null;
	unlocked: boolean;
	view: 'setup' | 'unlock' | 'manager';
	loading: boolean;
	error: string;
}

export const connections = writable<ConnectionsState>({
	connections: [],
	activeId: null,
	unlocked: false,
	view: 'unlock',
	loading: false,
	error: ''
});

function init() {
	if (!browser) return;
	void vaultExists().then((exists) => {
		connections.update((s) => ({ ...s, view: exists ? 'unlock' : 'setup' }));
	});
}

export function getConnections(): Connection[] {
	return get(connections).connections;
}

export function getActiveId(): string | null {
	return get(connections).activeId;
}

export function getUnlocked(): boolean {
	return get(connections).unlocked;
}

export function getView(): 'setup' | 'unlock' | 'manager' {
	return get(connections).view;
}

export function getLoading(): boolean {
	return get(connections).loading;
}

export function getError(): string {
	return get(connections).error;
}

export async function setupVault(password: string, conn: { name: string; apiUrl: string; mcpUrl: string; token: string }): Promise<boolean> {
	connections.update((s) => ({ ...s, loading: true, error: '' }));
	try {
		const mcpUrl = conn.mcpUrl.trim().replace(/\/+$/, '');
		await mcpCall(conn.token, 'ping', undefined, mcpUrl);
		const newConnections = await setup(password, conn);
		const activeId = newConnections[0].id;
		connections.set({
			connections: newConnections,
			activeId,
			unlocked: true,
			view: 'manager',
			loading: false,
			error: ''
		});
		auth.setSession(newConnections[0]);
		return true;
	} catch (e) {
		connections.update((s) => ({ ...s, loading: false, error: (e as Error)?.message || 'Failed to create vault' }));
		return false;
	}
}

export async function unlockVault(password: string): Promise<boolean> {
	connections.update((s) => ({ ...s, loading: true, error: '' }));
	try {
		const newConnections = await unlock(password);
		connections.set({
			connections: newConnections,
			activeId: newConnections.length > 0 ? newConnections[0].id : null,
			unlocked: true,
			view: 'manager',
			loading: false,
			error: ''
		});
		return true;
	} catch {
		connections.update((s) => ({ ...s, loading: false, error: 'Invalid master password' }));
		return false;
	}
}

export function lockVault(): void {
	lock();
	connections.set({
		connections: [],
		activeId: null,
		unlocked: false,
		view: 'unlock',
		loading: false,
		error: ''
	});
	auth.logout();
}

export async function addConnection(data: { name: string; apiUrl: string; mcpUrl: string; token: string }): Promise<boolean> {
	const state = get(connections);
	connections.update((s) => ({ ...s, error: '' }));
	try {
		const mcpUrl = data.mcpUrl.trim().replace(/\/+$/, '');
		await mcpCall(data.token, 'ping', undefined, mcpUrl);
		const newConnections = insert(data);
		connections.update((s) => ({ ...s, connections: newConnections }));
		return true;
	} catch (e) {
		connections.update((s) => ({ ...s, error: (e as Error)?.message || 'Failed to add connection' }));
		return false;
	}
}

export async function updateConnection(id: string, data: Partial<Omit<Connection, 'id' | 'createdAt'>>): Promise<boolean> {
	const state = get(connections);
	connections.update((s) => ({ ...s, error: '' }));
	try {
		if (data.token) {
			const mcpUrl = data.mcpUrl || state.connections.find((c) => c.id === id)?.mcpUrl || '';
			const normalizedMcp = mcpUrl.trim().replace(/\/+$/, '');
			await mcpCall(data.token, 'ping', undefined, normalizedMcp);
		}
		const newConnections = update(id, data);
		if (state.activeId === id) {
			const updated = newConnections.find((c) => c.id === id);
			if (updated) auth.setSession(updated);
		}
		connections.update((s) => ({ ...s, connections: newConnections }));
		return true;
	} catch (e) {
		connections.update((s) => ({ ...s, error: (e as Error)?.message || 'Failed to update connection' }));
		return false;
	}
}

export async function deleteConnection(id: string): Promise<void> {
	const state = get(connections);
	const newConnections = remove(id);
	if (state.activeId === id) {
		if (newConnections.length > 0) {
			await setActiveConnection(newConnections[0].id);
		} else {
			connections.set({
				connections: [],
				activeId: null,
				unlocked: false,
				view: 'unlock',
				loading: false,
				error: ''
			});
			auth.logout();
		}
	} else {
		connections.update((s) => ({ ...s, connections: newConnections }));
	}
}

export async function setActiveConnection(id: string): Promise<boolean> {
	const state = get(connections);
	const conn = state.connections.find((c) => c.id === id);
	if (!conn) return false;
	connections.update((s) => ({ ...s, error: '' }));
	try {
		const normalizedMcp = conn.mcpUrl.trim().replace(/\/+$/, '');
		await mcpCall(conn.token, 'ping', undefined, normalizedMcp);
		const newConnections = setLastUsed(id);
		auth.setSession(conn);
		connections.update((s) => ({ ...s, activeId: id, connections: newConnections }));
		return true;
	} catch (e) {
		connections.update((s) => ({ ...s, error: (e as Error)?.message || 'Failed to connect' }));
		return false;
	}
}

init();
