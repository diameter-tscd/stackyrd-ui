<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { getMetrics } from '$lib/api/endpoints';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardTitle from '$lib/components/ui/card-title.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Separator from '$lib/components/ui/separator.svelte';
	import { BarChart3, RefreshCw, Code, Activity } from 'lucide-svelte';

	let loading = $state(true);
	let rawMetrics = $state('');
	let showRaw = $state(false);
	let polling: ReturnType<typeof setInterval> | null = null;

	onMount(async () => {
		await fetchMetrics();
		polling = setInterval(fetchMetrics, 10000);
	});

	onDestroy(() => {
		if (polling) clearInterval(polling);
	});

	async function fetchMetrics() {
		try {
			rawMetrics = await getMetrics($auth.token);
		} catch {
			// silent fail on poll
		} finally {
			loading = false;
		}
	}

	function parseMetrics(text: string): { name: string; help: string; value: number }[] {
		const lines = text.split('\n');
		const metrics: { name: string; help: string; value: number }[] = [];
		const helps: Record<string, string> = {};
		for (const line of lines) {
			if (line.startsWith('# HELP ')) {
				const [, name, ...rest] = line.split(' ');
				helps[name] = rest.join(' ');
			} else if (line.startsWith('# TYPE ')) {
				continue;
			} else if (line && !line.startsWith('#')) {
				const parts = line.split(' ');
				const name = parts[0];
				const value = parseFloat(parts[parts.length - 1]);
				if (!isNaN(value)) metrics.push({ name, help: helps[name] || '', value });
			}
		}
		return metrics;
	}

	const parsedMetrics = $derived(parseMetrics(rawMetrics));
	const groupedMetrics = $derived({
		requests: parsedMetrics.filter((m) => m.name.includes('request')),
		errors: parsedMetrics.filter((m) => m.name.includes('error')),
		cache: parsedMetrics.filter((m) => m.name.includes('cache')),
		other: parsedMetrics.filter((m) => !m.name.includes('request') && !m.name.includes('error') && !m.name.includes('cache'))
	});
</script>

<PageHeader title="Metrics" subtitle="Prometheus metrics from /metrics endpoint">
	<div class="flex gap-2">
		<Button variant="outline" size="sm" onclick={() => showRaw = !showRaw} aria-pressed={showRaw}>
			<Code class="h-4 w-4" />
			{showRaw ? 'Grouped' : 'Raw'}
		</Button>
		<Button variant="outline" size="sm" onclick={fetchMetrics} aria-label="Refresh metrics">
			<RefreshCw class="h-4 w-4" />
			Refresh
		</Button>
	</div>
</PageHeader>

{#if loading}
	<div class="flex items-center justify-center py-20" role="status" aria-label="Loading metrics">
		<Spinner size="lg" />
	</div>
{:else if !rawMetrics}
	<EmptyState title="No metrics" message="No metrics available" icon={Activity} description="Metrics will appear once the server exposes Prometheus data on /metrics" />
{:else if showRaw}
	<Card>
		<CardContent class="p-6">
			<pre class="text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-[70vh] text-muted-foreground">{rawMetrics}</pre>
		</CardContent>
	</Card>
{:else}
	<div class="space-y-4">
		{#if groupedMetrics.requests.length > 0}
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="flex items-center gap-2 text-sm">
						<BarChart3 class="h-4 w-4 text-primary" aria-hidden="true" />
						Requests
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-0 divide-y divide-border">
					{#each groupedMetrics.requests as metric}
						<div class="flex items-center justify-between py-4 gap-5">
							<span class="font-mono text-xs truncate text-foreground">{metric.name}</span>
							<span class="text-sm font-medium tabular-nums shrink-0">{metric.value.toLocaleString()}</span>
						</div>
					{/each}
				</CardContent>
			</Card>
		{/if}
		{#if groupedMetrics.errors.length > 0}
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-sm">Errors</CardTitle>
				</CardHeader>
				<CardContent class="space-y-0 divide-y divide-border">
					{#each groupedMetrics.errors as metric}
						<div class="flex items-center justify-between py-4 gap-5">
							<span class="font-mono text-xs truncate">{metric.name}</span>
							<span class="text-sm font-medium tabular-nums text-destructive shrink-0">{metric.value.toLocaleString()}</span>
						</div>
					{/each}
				</CardContent>
			</Card>
		{/if}
		{#if groupedMetrics.cache.length > 0}
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-sm">Cache</CardTitle>
				</CardHeader>
				<CardContent class="space-y-0 divide-y divide-border">
					{#each groupedMetrics.cache as metric}
						<div class="flex items-center justify-between py-4 gap-5">
							<span class="font-mono text-xs truncate">{metric.name}</span>
							<span class="text-sm font-medium tabular-nums text-emerald-400 shrink-0">{metric.value.toLocaleString()}</span>
						</div>
					{/each}
				</CardContent>
			</Card>
		{/if}
		{#if groupedMetrics.other.length > 0}
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-sm">Other</CardTitle>
				</CardHeader>
				<CardContent class="space-y-0 divide-y divide-border">
					{#each groupedMetrics.other as metric}
						<div class="flex items-center justify-between py-4 gap-5">
							<span class="font-mono text-xs truncate">{metric.name}</span>
							<span class="text-sm text-muted-foreground tabular-nums shrink-0">{metric.value.toLocaleString()}</span>
						</div>
					{/each}
				</CardContent>
			</Card>
		{/if}
	</div>
{/if}
