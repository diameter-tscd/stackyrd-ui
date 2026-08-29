<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { services } from '$lib/stores/data';
	import { getMCPServices } from '$lib/api/endpoints';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { Server, RefreshCw, Search } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let loading = $state(true);
	let filter = $state<'all' | 'running' | 'failed' | 'disabled'>('all');
	let polling: ReturnType<typeof setInterval> | null = null;

	onMount(async () => {
		if (!$auth.authenticated) return;
		await fetchServices();
		polling = setInterval(() => fetchServices(), 15000);
	});

	onDestroy(() => {
		if (polling) clearInterval(polling);
	});

	$effect(() => {
		if (!$auth.authenticated && polling) { clearInterval(polling); polling = null; }
	});

	async function fetchServices() {
		if (!$auth.authenticated) return;
		try {
			const res = await getMCPServices($auth.token);
			if (res.data) services.set(res.data);
		} catch {
			// silent fail on poll
		} finally {
			loading = false;
		}
	}

	const filtered = $derived(
		filter === 'all' ? $services : $services.filter((s) => s.status === filter)
	);

	function statusVariant(status: string) {
		switch (status) {
			case 'running': return 'success';
			case 'failed': return 'error';
			case 'disabled': return 'neutral';
			default: return 'warning';
		}
	}

	const filters: Array<{ value: typeof filter; label: string }> = [
		{ value: 'all', label: 'All' },
		{ value: 'running', label: 'Running' },
		{ value: 'failed', label: 'Failed' },
		{ value: 'disabled', label: 'Disabled' }
	];
</script>

<PageHeader title="Services" subtitle="{$services.length} services discovered">
	<Button variant="outline" size="sm" onclick={fetchServices} aria-label="Refresh services">
		<RefreshCw class="h-4 w-4" />
		Refresh
	</Button>
</PageHeader>

<div class="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter services">
	{#each filters as f}
		<Button
			variant={filter === f.value ? "default" : "outline"}
			size="sm"
			onclick={() => filter = f.value}
			aria-pressed={filter === f.value}
		>
			{f.label}
		</Button>
	{/each}
</div>

{#if loading}
	<div class="flex items-center justify-center py-20" role="status" aria-label="Loading services">
		<Spinner size="lg" />
	</div>
{:else if filtered.length === 0}
	<EmptyState title="No services found" message="No services match the current filter" icon={Search} />
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
		{#each filtered as service}
			<Card class="hover:border-primary/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" onclick={() => goto(`/services/${service.name}`)} role="button" tabindex={0} onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && goto(`/services/${service.name}`)}>
				<CardContent class="p-7">
					<div class="flex items-start justify-between mb-4">
						<div class="flex items-center gap-2 min-w-0">
							<span class="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
								<Server class="h-4 w-4 text-primary" aria-hidden="true" />
							</span>
							<h3 class="text-sm font-semibold leading-none truncate">{service.name}</h3>
						</div>
						<Badge variant={statusVariant(service.status)} class="ml-2 shrink-0">{service.status}</Badge>
					</div>
					<dl class="space-y-2 text-xs">
						<div class="flex justify-between gap-5">
							<dt class="text-muted-foreground">Wire Name</dt>
							<dd class="font-mono font-medium truncate">{service.wire_name}</dd>
						</div>
						<div class="flex justify-between gap-5">
							<dt class="text-muted-foreground">Endpoints</dt>
							<dd class="font-medium">{service.endpoints.length}</dd>
						</div>
						<div class="flex justify-between gap-5">
							<dt class="text-muted-foreground">Enabled</dt>
							<dd class="font-medium">{service.enabled ? 'Yes' : 'No'}</dd>
						</div>
					</dl>
				</CardContent>
			</Card>
		{/each}
	</div>
{/if}
