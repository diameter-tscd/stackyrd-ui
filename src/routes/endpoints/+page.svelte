<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { endpoints } from '$lib/stores/data';
	import { getMCPEndpoints } from '$lib/api/endpoints';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Separator from '$lib/components/ui/separator.svelte';
	import { Route, RefreshCw, ChevronDown, ChevronRight } from 'lucide-svelte';

	let loading = $state(true);
	let polling: ReturnType<typeof setInterval> | null = null;
	let expandedService = $state<string | null>(null);

	onMount(async () => {
		if (!$auth.authenticated) return;
		await fetchEndpoints();
		polling = setInterval(fetchEndpoints, 30000);
	});

	onDestroy(() => {
		if (polling) clearInterval(polling);
	});

	$effect(() => {
		if (!$auth.authenticated && polling) { clearInterval(polling); polling = null; }
	});

	async function fetchEndpoints() {
		if (!$auth.authenticated) return;
		try {
			const res = await getMCPEndpoints($auth.token);
			if (res.data) endpoints.set(res.data);
		} catch {
			// silent fail
		} finally {
			loading = false;
		}
	}

	function methodColor(method: string) {
		switch (method) {
			case 'GET': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
			case 'POST': return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
			case 'PUT': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
			case 'PATCH': return 'text-violet-400 bg-violet-500/10 border-violet-500/30';
			case 'DELETE': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
			default: return 'text-muted-foreground bg-muted border-border';
		}
	}
</script>

<PageHeader title="Endpoints" subtitle="{$endpoints?.total ?? 0} API endpoints discovered">
	<Button variant="outline" size="sm" onclick={fetchEndpoints} aria-label="Refresh endpoints">
		<RefreshCw class="h-4 w-4" />
		Refresh
	</Button>
</PageHeader>

{#if loading}
	<div class="flex items-center justify-center py-20" role="status" aria-label="Loading endpoints">
		<Spinner size="lg" />
	</div>
{:else if !$endpoints || $endpoints.services.length === 0}
	<EmptyState title="No endpoints" message="No endpoints discovered" icon={Route} description="API routes will appear once services register their endpoints" />
{:else}
	<div class="space-y-3">
		{#each $endpoints.services as group}
			<Card class="p-0 overflow-hidden">
				<button
					class="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset"
					onclick={() => expandedService = expandedService === group.service ? null : group.service}
					aria-expanded={expandedService === group.service}
				>
					{#if expandedService === group.service}
						<ChevronDown class="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
					{:else}
						<ChevronRight class="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
					{/if}
					<Route class="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
					<span class="text-sm font-semibold truncate">{group.service}</span>
					<span class="text-xs text-muted-foreground ml-auto shrink-0">{group.endpoints.length} endpoints</span>
				</button>

				{#if expandedService === group.service}
					<Separator />
					<div class="divide-y divide-border">
						{#each group.endpoints as endpoint}
							<div class="flex items-center gap-3 px-6 py-4">
								<Badge variant="outline" class="font-mono text-xs font-bold shrink-0 {methodColor(endpoint.method)}">
									{endpoint.method}
								</Badge>
								<span class="text-sm font-mono flex-1 truncate">{endpoint.path}</span>
								{#if endpoint.description}
									<span class="text-xs text-muted-foreground hidden sm:block truncate max-w-[200px]">{endpoint.description}</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</Card>
		{/each}
	</div>
{/if}
