<script lang="ts">
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
	import { BarChart3, RefreshCw, Code, Activity, WifiOff, Settings } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { ApiError } from '$lib/api/rest';
	import { onMount } from 'svelte';

	let loading = $state(true);
	let rawMetrics = $state('');
	let showRaw = $state(false);
	let unavailable = $state(false);
	let errorMessage = $state('');
	let statusCode: number | null = $state(null);

	async function fetchMetrics() {
		if (!$auth.authenticated) return;
		try {
			const text = await getMetrics($auth.token);
			if (!text || !text.trim()) {
				rawMetrics = '';
				unavailable = false;
				errorMessage = '';
				statusCode = null;
			} else {
				rawMetrics = text;
				unavailable = false;
				errorMessage = '';
				statusCode = null;
			}
		} catch (e) {
			const err = e as Error & { status?: number; data?: unknown };
			const code = (err as ApiError)?.status ?? (err as { status?: number })?.status ?? null;
			statusCode = code;
			errorMessage = err?.message || String(e);
			const text = String((err as ApiError)?.data ?? errorMessage).toLowerCase();
			const isServiceUnavailable =
				code === 503 ||
				code === 404 ||
				code === 502 ||
				text.includes('service unavailable') ||
				text.includes('metrics disabled') ||
				text.includes('not enabled') ||
				text.includes('failed to fetch') ||
				errorMessage.toLowerCase().includes('failed to fetch') ||
				errorMessage.toLowerCase().includes('networkerror');
			if (isServiceUnavailable) {
				unavailable = true;
				rawMetrics = '';
			} else {
				unavailable = false;
			}
		} finally {
			loading = false;
		}
	}

	function parseMetrics(text: string): { name: string; raw: string; help: string; value: number }[] {
		if (!text) return [];
		const lines = text.split('\n');
		const metrics: { name: string; raw: string; help: string; value: number }[] = [];
		const helps: Record<string, string> = {};
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line) continue;
			if (line.startsWith('# HELP ')) {
				const sp = line.indexOf(' ', 7);
				if (sp !== -1) {
					const name = line.slice(7, sp);
					helps[name] = line.slice(sp + 1);
				}
			} else if (line.startsWith('#')) continue;
			else {
				const lastSp = line.lastIndexOf(' ');
				if (lastSp === -1) continue;
				const raw = line.slice(0, lastSp);
				const name = raw.split('{')[0];
				const value = parseFloat(line.slice(lastSp + 1));
				if (!Number.isNaN(value)) metrics.push({ name, raw, help: helps[name] ?? '', value });
			}
		}
		return metrics;
	}

	const parsedMetrics = $derived.by(() => parseMetrics(rawMetrics));
	const groupedMetrics = $derived.by(() => {
		const p = parsedMetrics;
		const requests: typeof p = [];
		const errors: typeof p = [];
		const cache: typeof p = [];
		const other: typeof p = [];
		for (const m of p) {
			if (m.name.includes('request')) requests.push(m);
			else if (m.name.includes('error')) errors.push(m);
			else if (m.name.includes('cache')) cache.push(m);
			else other.push(m);
		}
		return { requests, errors, cache, other };
	});

	onMount(() => {
		if ($auth.authenticated) fetchMetrics();
	});
</script>

<PageHeader title="Metrics" subtitle="Prometheus metrics from /metrics endpoint">
	<div class="flex gap-2">
		<Button variant="outline" size="sm" onclick={() => showRaw = !showRaw} aria-pressed={showRaw} disabled={unavailable}>
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
{:else if unavailable}
	<Card class="border-2 border-black overflow-hidden">
		<div class="p-10 flex flex-col items-center text-center">
			<span class="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black border-2 border-black mb-4">
				<WifiOff class="h-8 w-8" aria-hidden="true" />
			</span>
			<h3 class="text-lg font-bold tracking-tight" style="font-family: var(--font-display);">Service unavailable</h3>
			<p class="mt-2 text-sm font-semibold text-foreground">Metrics service is not running or disabled</p>
			<p class="mt-1 max-w-md text-xs font-mono text-muted-foreground leading-relaxed">
				The Prometheus endpoint <code class="bg-muted px-1.5 py-0.5 rounded-full border border-black text-[11px]">/metrics</code> returned {statusCode ? `HTTP ${statusCode}` : 'no response'}{errorMessage ? ` — ${errorMessage.slice(0, 120)}` : ''}.
				Ensure <code class="bg-muted px-1 py-0.5 rounded-full border border-black text-[11px]">metrics.enabled=true</code> in config and the server is reachable on <code class="bg-muted px-1 py-0.5 rounded-full border border-black text-[11px]">:8080</code>.
			</p>
			<div class="flex gap-2 mt-6">
				<Button variant="default" size="sm" onclick={fetchMetrics} class="rounded-full">
					<RefreshCw class="h-4 w-4" /> Retry
				</Button>
				<Button variant="outline" size="sm" onclick={() => goto('/settings')} class="rounded-full border-black">
					<Settings class="h-4 w-4" /> Settings
				</Button>
			</div>
		</div>
	</Card>
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
					{#each groupedMetrics.requests as metric, i (metric.raw + '|' + i)}
						<div class="flex items-center justify-between py-4 gap-5">
							<span class="font-mono text-xs truncate text-foreground" title={metric.raw}>{metric.raw}</span>
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
					{#each groupedMetrics.errors as metric, i (metric.raw + '|' + i)}
						<div class="flex items-center justify-between py-4 gap-5">
							<span class="font-mono text-xs truncate" title={metric.raw}>{metric.raw}</span>
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
					{#each groupedMetrics.cache as metric, i (metric.raw + '|' + i)}
						<div class="flex items-center justify-between py-4 gap-5">
							<span class="font-mono text-xs truncate" title={metric.raw}>{metric.raw}</span>
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
					{#each groupedMetrics.other as metric, i (metric.raw + '|' + i)}
						<div class="flex items-center justify-between py-4 gap-5">
							<span class="font-mono text-xs truncate" title={metric.raw}>{metric.raw}</span>
							<span class="text-sm text-muted-foreground tabular-nums shrink-0">{metric.value.toLocaleString()}</span>
						</div>
					{/each}
				</CardContent>
			</Card>
		{/if}
	</div>
{/if}
