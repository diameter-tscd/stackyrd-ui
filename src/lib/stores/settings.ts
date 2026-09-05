import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const DISABLE_ANIMATION_KEY = 'stackyrd_disable_animation';
const REMEMBER_VAULT_KEY = 'stackyrd_remember_vault';
const VAULT_SESSION_KEY = 'stackyrd_vault_session';

function loadDisableAnimation(): boolean {
	if (!browser) return false;
	try {
		return localStorage.getItem(DISABLE_ANIMATION_KEY) === 'true';
	} catch {
		return false;
	}
}

function loadRememberVault(): boolean {
	if (!browser) return false;
	try {
		return localStorage.getItem(REMEMBER_VAULT_KEY) === 'true';
	} catch {
		return false;
	}
}

export const disableAnimation = writable<boolean>(loadDisableAnimation());
export const rememberVaultSession = writable<boolean>(loadRememberVault());

if (browser) {
	disableAnimation.subscribe((v) => {
		try {
			localStorage.setItem(DISABLE_ANIMATION_KEY, String(v));
			if (v) document.documentElement.setAttribute('data-disable-anim', 'true');
			else document.documentElement.removeAttribute('data-disable-anim');
		} catch {}
	});
	try {
		if (loadDisableAnimation()) document.documentElement.setAttribute('data-disable-anim', 'true');
	} catch {}

	rememberVaultSession.subscribe((v) => {
		try {
			localStorage.setItem(REMEMBER_VAULT_KEY, String(v));
			if (!v) {
				localStorage.removeItem(VAULT_SESSION_KEY);
				try { sessionStorage.removeItem(VAULT_SESSION_KEY); } catch {}
			}
		} catch {}
	});
}

export function getVaultSessionPassword(): string | null {
	if (!browser) return null;
	try {
		return localStorage.getItem(VAULT_SESSION_KEY) || sessionStorage.getItem(VAULT_SESSION_KEY);
	} catch {
		return null;
	}
}

export function setVaultSessionPassword(password: string): void {
	if (!browser) return;
	try {
		const remember = localStorage.getItem(REMEMBER_VAULT_KEY) === 'true';
		if (!remember) return;
		localStorage.setItem(VAULT_SESSION_KEY, password);
	} catch {}
}

export function clearVaultSession(): void {
	if (!browser) return;
	try {
		localStorage.removeItem(VAULT_SESSION_KEY);
		sessionStorage.removeItem(VAULT_SESSION_KEY);
	} catch {}
}
