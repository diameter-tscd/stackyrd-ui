<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import TopBar from '$lib/components/layout/TopBar.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ConnectionAlert from '$lib/components/ui/connection-alert.svelte';
	import { sidebarCollapsed } from '$lib/stores/auth';

	let { children } = $props();

	let navigatedByGuard = $state(false);

	onMount(() => {
		if (!$auth.authenticated && $page.url.pathname !== '/login') {
			navigatedByGuard = true;
			goto('/login');
		}
	});

	$effect(() => {
		if (navigatedByGuard) return;
		if (!$auth.authenticated && $page.url.pathname !== '/login') {
			navigatedByGuard = true;
			goto('/login');
		}
	});
</script>

{#if $auth.authenticated}
	<Sidebar />
	<TopBar />
	<main
		class="pt-16 min-h-screen transition-all duration-200 {$sidebarCollapsed ? 'pl-16' : 'pl-64'}"
	>
		<div class="p-6 md:p-8">
			<ConnectionAlert />
			{@render children()}
		</div>
	</main>
{:else}
	{@render children()}
{/if}

<Toast />
