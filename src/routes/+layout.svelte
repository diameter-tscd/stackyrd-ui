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
	import { disableAnimation } from '$lib/stores/settings';
	import { logStore } from '$lib/stores/logs';
	import { connectionStatus } from '$lib/stores/data';
	import { mcpPoller } from '$lib/stores/mcpPoller';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { children } = $props();

	let systemReduce = $state(false);
	let reduceMotion = $derived($disableAnimation || systemReduce);

	onMount(() => {
		const m = window.matchMedia('(prefers-reduced-motion: reduce)');
		systemReduce = m.matches;
		const handler = () => (systemReduce = m.matches);
		m.addEventListener('change', handler);
		if ($auth.authenticated) {
			logStore.start();
			mcpPoller.start();
			mcpPoller.startGoroutinePolling();
		} else {
			logStore.stop();
			connectionStatus.set('checking');
		}
		return () => m.removeEventListener('change', handler);
	});

	onDestroy(() => {
		mcpPoller.stop();
	});

	$effect(() => {
		if (!$auth.authenticated && $page.url.pathname !== '/login') {
			goto('/login', { replaceState: true });
		}
		if ($auth.authenticated) {
			logStore.start();
			mcpPoller.start();
			mcpPoller.startGoroutinePolling();
		} else {
			logStore.stop();
			mcpPoller.stop();
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
