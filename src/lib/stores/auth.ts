import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

export interface AuthState {
	token: string;
	apiUrl: string;
	mcpUrl: string;
	authenticated: boolean;
	lastChecked: string | null;
}

const STORAGE_KEY = 'stackyrd_auth';

function loadAuth(): AuthState {
	if (!browser) {
		return { token: '', apiUrl: '', mcpUrl: '', authenticated: false, lastChecked: null };
	}
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored) {
		try {
			return JSON.parse(stored);
		} catch {
			return { token: '', apiUrl: '', mcpUrl: '', authenticated: false, lastChecked: null };
		}
	}
	return { token: '', apiUrl: '', mcpUrl: '', authenticated: false, lastChecked: null };
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(loadAuth());

	return {
		subscribe,
		setToken: (token: string) =>
			update((s) => {
				const next = { ...s, token, authenticated: !!token };
				if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				return next;
			}),
		setUrls: (apiUrl: string, mcpUrl: string) =>
			update((s) => {
				const next = { ...s, apiUrl, mcpUrl };
				if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				return next;
			}),
		setAuthenticated: (authenticated: boolean) =>
			update((s) => {
				const next = { ...s, authenticated, lastChecked: new Date().toISOString() };
				if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				return next;
			}),
		logout: () => {
			if (browser) localStorage.removeItem(STORAGE_KEY);
			set({ token: '', apiUrl: '', mcpUrl: '', authenticated: false, lastChecked: null });
		}
	};
}

export const auth = createAuthStore();

export type ThemeName = 'light' | 'dark' | 'night';

const VALID_THEMES: ThemeName[] = ['light', 'dark', 'night'];

export const theme = writable<ThemeName>(loadTheme());

function loadTheme(): ThemeName {
	if (!browser) return 'dark';
	const stored = localStorage.getItem('stackyrd_theme');
	if (stored && (VALID_THEMES as string[]).includes(stored)) return stored as ThemeName;
	return 'dark';
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
