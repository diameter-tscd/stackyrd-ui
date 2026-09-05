import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { logStore } from './logs';
import { health, services, infra, resources, instanceIdentity, mcpUptime, mcpInstanceId, connectionStatus, goroutineDump, goroutineHistory } from './data';
import type { Connection } from '$lib/vault/vault';

export interface AuthState {
	token: string;
	apiUrl: string;
	mcpUrl: string;
	authenticated: boolean;
	lastChecked: string | null;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		token: '',
		apiUrl: '',
		mcpUrl: '',
		authenticated: false,
		lastChecked: null
	});

	return {
		subscribe,
		setSession: (conn: Connection) =>
			update((s) => ({
				...s,
				token: conn.token,
				apiUrl: conn.apiUrl,
				mcpUrl: conn.mcpUrl,
				authenticated: true,
				lastChecked: new Date().toISOString()
			})),
		setAuthenticated: (authenticated: boolean) =>
			update((s) => ({
				...s,
				authenticated,
				lastChecked: new Date().toISOString()
			})),
		logout: () => {
			if (browser) {
				try { logStore.stop(); } catch {}
				try { health.set(null); } catch {}
				try { services.set([]); } catch {}
				try { infra.set([]); } catch {}
				try { resources.set(null); } catch {}
				try { instanceIdentity.set(null); } catch {}
				try { mcpUptime.set(null); } catch {}
				try { mcpInstanceId.set(null); } catch {}
				try { goroutineDump.set(null); } catch {}
				try { goroutineHistory.set([]); } catch {}
				try { connectionStatus.set('checking'); } catch {}
				try {
					update(() => ({ token: '', apiUrl: '', mcpUrl: '', authenticated: false, lastChecked: null }));
					return;
				} catch {}
			}
			set({ token: '', apiUrl: '', mcpUrl: '', authenticated: false, lastChecked: null });
		}
	};
}

export const auth = createAuthStore();

export type ThemeName = 'light' | 'dark' | 'night';

const VALID_THEMES: ThemeName[] = ['light', 'dark', 'night'];

export const theme = writable<ThemeName>(loadTheme());

function loadTheme(): ThemeName {
	if (!browser) return 'light';
	const stored = localStorage.getItem('stackyrd_theme');
	if (stored && (VALID_THEMES as string[]).includes(stored)) return stored as ThemeName;
	return 'light';
}

function applyTheme(value: ThemeName) {
	if (!browser) return;
	const root = document.documentElement;
	root.classList.remove('light', 'dark', 'night');
	root.classList.add(value);
	root.style.colorScheme = value === 'light' ? 'light' : 'dark';
}

theme.subscribe((val) => {
	if (browser) {
		localStorage.setItem('stackyrd_theme', val);
		applyTheme(val);
	}
});

if (browser) {
	applyTheme(loadTheme());
}

export interface Toast {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	message: string;
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	return {
		subscribe,
		add: (type: Toast['type'], message: string, duration = 5000) => {
			const id = crypto.randomUUID();
			update((toasts) => [...toasts, { id, type, message, duration }]);
			if (duration > 0) {
				setTimeout(() => {
					update((toasts) => toasts.filter((t) => t.id !== id));
				}, duration);
			}
			return id;
		},
		dismiss: (id: string) => update((toasts) => toasts.filter((t) => t.id !== id)),
		clear: () => update(() => [])
	};
}

export const toasts = createToastStore();

export const sidebarCollapsed = writable<boolean>(false);

export function isAuthenticatedStore(): Readable<boolean> {
	return derived(auth, ($auth) => $auth.authenticated);
}
