<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { infra, connectionStatus } from '$lib/stores/data';
	import { getMCPInfra } from '$lib/api/endpoints';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { HardDrive, RefreshCw, PlugZap } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let loading = $state(true);
	let polling: ReturnType<typeof setInterval> | null = null;

	onMount(async () => {
		if (!$auth.authenticated) return;
		await fetchInfra();
		polling = setInterval(fetchInfra, 5000);
	});

	onDestroy(() => {
		if (polling) clearInterval(polling);
	});

	$effect(() => {
		if (!$auth.authenticated && polling) { clearInterval(polling); polling = null; }
	});

	async function fetchInfra() {
		if (!$auth.authenticated) return;
		try {
			const res = await getMCPInfra($auth.token);
			if (res.data) infra.set(res.data);
			connectionStatus.set('connected');
		} catch {
			connectionStatus.set('disconnected');
		} finally {
			loading = false;
		}
	}

	function statusVariant(status: string) {
		switch (status) {
			case 'connected': return 'success';
			case 'error': return 'error';
			case 'disconnected': return 'neutral';
			default: return 'warning';
		}
	}
</script>

<PageHeader title="Infrastructure" subtitle="Component status and connections">
	<Button variant="outline" size="sm" onclick={fetchInfra} aria-label="Refresh infrastructure">
		<RefreshCw class="h-4 w-4" />
		Refresh
	</Button>
</PageHeader>

{#if loading}
	<div class="flex items-center justify-center py-20" role="status" aria-label="Loading infrastructure">
		<Spinner size="lg" />
	</div>
{:else if $infra.length === 0}
	<EmptyState title="No infrastructure" message="No infrastructure components discovered" icon={PlugZap} description="Components will appear once connected to Redis, Postgres, Kafka and others" />
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
		{#each $infra as component}
			<Card class="hover:border-primary/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" onclick={() => goto(`/infrastructure/${component.name}`)} role="button" tabindex={0} onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && goto(`/infrastructure/${component.name}`)}>
				<CardContent class="p-7">
					<div class="flex items-start justify-between mb-4">
						<div class="flex items-center gap-2 min-w-0">
							<span class="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 shrink-0">
								<HardDrive class="h-4 w-4 text-violet-500" aria-hidden="true" />
							</span>
							<h3 class="text-sm font-semibold leading-none truncate">{component.name}</h3>
						</div>
						<Badge variant={statusVariant(component.status)} class="ml-2 shrink-0">{component.status}</Badge>
					</div>
					<dl class="space-y-2 text-xs">
						<div class="flex justify-between gap-5">
							<dt class="text-muted-foreground">Type</dt>
							<dd class="font-medium truncate">{component.type}</dd>
						</div>
						<div class="flex justify-between gap-5">
							<dt class="text-muted-foreground">Last Check</dt>
							<dd class="text-muted-foreground truncate">{component.last_check || 'Never'}</dd>
						</div>
						{#if component.details.host}
							<div class="flex justify-between gap-5">
								<dt class="text-muted-foreground">Host</dt>
								<dd class="font-mono font-medium truncate">{component.details.host}:{component.details.port}</dd>
							</div>
						{/if}
					</dl>
				</CardContent>
			</Card>
		{/each}
	</div>
{/if}
