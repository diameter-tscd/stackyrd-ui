<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import { services } from '$lib/stores/data';
	import { getMCPServices } from '$lib/api/endpoints';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardTitle from '$lib/components/ui/card-title.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Separator from '$lib/components/ui/separator.svelte';
	import { ArrowLeft, Server, Route } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	const serviceName = $derived($page.params.name);
	const service = $derived($services.find((s) => s.name === serviceName));
	let loading = $state(false);

	onMount(async () => {
		if ($services.length === 0) {
			loading = true;
			try {
				const res = await getMCPServices($auth.token);
				if (res.data) services.set(res.data);
			} catch {}
			loading = false;
			if ($services.length === 0) goto('/services');
		}
	});

	function statusVariant(status: string) {
		switch (status) {
			case 'running': return 'success';
			case 'failed': return 'error';
			case 'disabled': return 'neutral';
			default: return 'warning';
		}
	}

	function methodClass(method: string) {
		switch (method) {
			case 'GET': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
			case 'POST': return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
			case 'PUT': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
			case 'DELETE': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
			default: return 'text-muted-foreground bg-muted border-border';
		}
	}
</script>

<PageHeader title={serviceName ?? 'Service'} subtitle="Service details and endpoints">
	<Button variant="outline" size="sm" onclick={() => goto('/services')} aria-label="Back to services">
		<ArrowLeft class="h-4 w-4" />
		Back
	</Button>
</PageHeader>

{#if !service}
	<div class="flex items-center justify-center py-20" role="status" aria-label="Loading service">
		<Spinner size="lg" />
	</div>
{:else}
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
		<Card>
			<CardHeader class="pb-2">
				<p class="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
			</CardHeader>
			<CardContent>
				<Badge variant={statusVariant(service.status)}>{service.status}</Badge>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="pb-2">
				<p class="text-xs text-muted-foreground uppercase tracking-wide">Wire Name</p>
			</CardHeader>
			<CardContent>
				<p class="font-mono text-sm font-medium truncate">{service.wire_name}</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="pb-2">
				<p class="text-xs text-muted-foreground uppercase tracking-wide">Endpoints</p>
			</CardHeader>
			<CardContent>
				<p class="font-mono text-sm font-medium">{service.endpoints.length}</p>
			</CardContent>
		</Card>
	</div>

	{#if service.dependencies.length > 0}
		<Card class="mb-4">
			<CardHeader>
				<CardTitle class="text-sm">Dependencies</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex flex-wrap gap-2">
					{#each service.dependencies as dep}
						<Badge variant="outline" class="bg-muted">{dep}</Badge>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle class="text-sm flex items-center gap-2">
				<Route class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
				Endpoints
			</CardTitle>
		</CardHeader>
		<CardContent>
			{#if service.endpoints.length === 0}
				<EmptyState message="No endpoints registered" description="This service has not exposed any HTTP routes" icon={Route} />
			{:else}
				<Separator class="mb-4" />
				<div class="divide-y divide-border">
					{#each service.endpoints as endpoint}
						<div class="flex items-center gap-3 py-3">
							<Badge variant="outline" class="font-mono text-xs font-bold shrink-0 {methodClass(endpoint.method)}">{endpoint.method}</Badge>
							<span class="text-sm font-mono flex-1 truncate">{endpoint.path}</span>
							{#if endpoint.description}
								<span class="text-xs text-muted-foreground hidden md:block truncate max-w-[240px]">{endpoint.description}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
{/if}
