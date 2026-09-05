<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import { getMCPInfraDetail } from '$lib/api/endpoints';
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
	import { ArrowLeft, HardDrive, AlertTriangle } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import type { InfraStatus } from '$lib/types/api';

	let loading = $state(true);
	let detail = $state<InfraStatus | null>(null);
	let error = $state('');

	const name = $derived($page.params.name ?? '');

	onMount(async () => {
		if (!name) {
			error = 'No component specified';
			loading = false;
			return;
		}
		try {
			const res = await getMCPInfraDetail($auth.token, name);
			if (res.data) detail = res.data;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load details';
		} finally {
			loading = false;
		}
	});

	function statusVariant(status: string) {
		switch (status) {
			case 'connected': return 'success';
			case 'error': return 'error';
			case 'disconnected': return 'neutral';
			default: return 'warning';
		}
	}
</script>

<svelte:head>
	<title>{name ? `${name} - Stackyrd` : 'Infrastructure - Stackyrd'}</title>
	<meta name="description" content="{name ? `${name} - Stackyrd` : 'Infrastructure - Stackyrd'}" />
</svelte:head>

<PageHeader title={name || 'Component'} subtitle="Infrastructure component details">
	<Button variant="outline" size="sm" onclick={() => goto('/infrastructure')} aria-label="Back to infrastructure">
		<ArrowLeft class="h-4 w-4" />
		Back
	</Button>
</PageHeader>

{#if loading}
	<div class="flex items-center justify-center py-20" role="status" aria-label="Loading component details">
		<Spinner size="lg" />
	</div>
{:else if error}
	<EmptyState title="Error" message={error} icon={AlertTriangle} />
{:else if detail}
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
		<Card>
			<CardHeader class="pb-2">
				<p class="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
			</CardHeader>
			<CardContent>
				<Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="pb-2">
				<p class="text-xs text-muted-foreground uppercase tracking-wide">Type</p>
			</CardHeader>
			<CardContent>
				<p class="font-mono text-sm font-medium">{detail.type}</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="pb-2">
				<p class="text-xs text-muted-foreground uppercase tracking-wide">Last Check</p>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground">{detail.last_check || 'Never'}</p>
			</CardContent>
		</Card>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="text-sm flex items-center gap-2">
				<HardDrive class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
				Details
			</CardTitle>
		</CardHeader>
		<CardContent>
			<Separator class="mb-4" />
			<pre class="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto text-foreground">{JSON.stringify(detail.details, null, 2)}</pre>
		</CardContent>
	</Card>
{/if}
