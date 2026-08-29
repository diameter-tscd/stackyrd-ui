<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import TopBar from '$lib/components/layout/TopBar.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ConnectionAlert from '$lib/components/ui/connection-alert.svelte';
	import { sidebarCollapsed } from '$lib/stores/auth';
	import { logStore } from '$lib/stores/logs';
	import { health, connectionStatus } from '$lib/stores/data';
	import { getHealth } from '$lib/api/endpoints';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { children } = $props();

	let reduceMotion = $state(false);
	let healthPolling: ReturnType<typeof setInterval> | null = null;

	async function checkHealth() {
		if (!$auth.authenticated) return;
		try {
			const res = await getHealth($auth.token);
			if (res?.data) health.set(res.data);
			connectionStatus.set('connected');
		} catch {
			connectionStatus.set('disconnected');
		}
	}

	onMount(() => {
		reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if ($auth.authenticated) {
			logStore.start();
			checkHealth();
			healthPolling = setInterval(checkHealth, 10000);
		} else {
			logStore.stop();
			connectionStatus.set('checking');
		}
	});

	onDestroy(() => {
		if (healthPolling) clearInterval(healthPolling);
	});

	$effect(() => {
		if (!$auth.authenticated && $page.url.pathname !== '/login') {
			goto('/login', { replaceState: true });
		}
		if ($auth.authenticated) {
			logStore.start();
			if (!healthPolling) {
				checkHealth();
				healthPolling = setInterval(checkHealth, 10000);
			}
		} else {
			logStore.stop();
			if (healthPolling) { clearInterval(healthPolling); healthPolling = null; }
			connectionStatus.set('checking');
		}
	});
</script>

{#if $auth.authenticated}
	<Sidebar />
	<TopBar />
	<main
		class="pt-16 min-h-screen transition-all duration-200 {$sidebarCollapsed ? 'pl-16' : 'pl-64'}"
	>
		<div class="p-6 md:p-8 overflow-hidden">
			{#if reduceMotion}
				<ConnectionAlert />
				{@render children()}
			{:else}
				{#key $page.url.pathname}
					<div in:fly={{ y: 12, duration: 320, easing: cubicOut, opacity: 0 }}>
						<ConnectionAlert />
						{@render children()}
					</div>
				{/key}
			{/if}
		</div>
	</main>
{:else}
	{#if reduceMotion}
		{@render children()}
	{:else}
		{#key $page.url.pathname}
			<div in:fly={{ y: 10, duration: 280, easing: cubicOut, opacity: 0 }}>
				{@render children()}
			</div>
		{/key}
	{/if}
{/if}

<Toast />
