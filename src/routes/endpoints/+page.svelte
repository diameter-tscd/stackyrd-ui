<script lang="ts">
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
	let expandedService = $state<string | null>(null);

	$effect(() => {
		if ($endpoints) loading = false;
	});

	async function refreshEndpoints() {
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

	function toggleExpand(service: string) {
		expandedService = expandedService === service ? null : service;
	}
</script>

<svelte:head>
	<title>Endpoints - Stackyrd</title>
	<meta name="description" content="Endpoints - Stackyrd" />
</svelte:head>

<PageHeader title="Endpoints" subtitle="{$endpoints?.total ?? 0} endpoints across {$endpoints?.services?.length ?? 0} services">
	<Button variant="outline" size="sm" onclick={refreshEndpoints} aria-label="Refresh endpoints">
		<RefreshCw class="h-4 w-4" />
		Refresh
	</Button>
</PageHeader>

{#if loading}
	<div class="flex items-center justify-center py-20" role="status" aria-label="Loading endpoints">
		<Spinner size="lg" />
	</div>
{:else if !$endpoints || $endpoints.services.length === 0}
	<EmptyState title="No endpoints" message="No endpoints discovered" icon={Route} />
{:else}
	<div class="space-y-3">
		{#each $endpoints.services as group}
			<Card>
				<CardContent class="p-4">
					<button class="flex items-center justify-between w-full text-left" onclick={() => toggleExpand(group.service)} aria-expanded={expandedService === group.service}>
						<div class="flex items-center gap-2">
							<Route class="h-4 w-4 text-primary" />
							<span class="text-sm font-semibold">{group.service}</span>
							<Badge variant="outline" class="ml-2">{group.endpoints.length}</Badge>
						</div>
						{#if expandedService === group.service}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</button>
					{#if expandedService === group.service}
						<div class="mt-4 space-y-2">
							{#each group.endpoints as endpoint}
								<div class="flex items-center gap-3 py-2 px-3 rounded-lg bg-secondary/50">
									<Badge variant="outline" class="font-mono text-[10px] shrink-0">{endpoint.method}</Badge>
									<span class="text-xs font-mono truncate">{endpoint.path}</span>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		{/each}
	</div>
{/if}
