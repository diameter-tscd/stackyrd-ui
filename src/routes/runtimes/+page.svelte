<script lang="ts">
	import { onMount } from 'svelte';
	import { goroutineDump, goroutineHistory } from '$lib/stores/data';
	import { mcpPoller } from '$lib/stores/mcpPoller';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardTitle from '$lib/components/ui/card-title.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { Activity, RefreshCw, AlertTriangle } from 'lucide-svelte';

	let mounted = $state(false);
	let plotReady = $state(false);
	let visible = $state(false);
	let chartContainer: HTMLDivElement | undefined = $state(undefined);
	let PlotComp: any = $state(null);
	let BarYComp: any = $state(null);
	let LineComp: any = $state(null);
	let RuleYComp: any = $state(null);
	let FrameComp: any = $state(null);
	let GridYComp: any = $state(null);

	onMount(() => { mounted = true; });

	$effect(() => {
		if (!chartContainer || visible) return;
		const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { visible = true; obs.disconnect(); } }, { rootMargin: '200px' });
		obs.observe(chartContainer);
		return () => obs.disconnect();
	});

	$effect(() => {
		if (!visible || plotReady || $goroutineHistory.length < 2) return;
		(async () => {
			const m = await import('svelteplot');
			PlotComp = m.Plot; BarYComp = m.BarY; LineComp = m.Line; RuleYComp = m.RuleY; FrameComp = m.Frame; GridYComp = m.GridY;
			plotReady = true;
		})();
	});

	const MAX_POINTS = 120;

	const chartData = $derived.by(() => {
		const h = $goroutineHistory;
		const out = new Array(h.length);
		for (let i = 0; i < h.length; i++) out[i] = { idx: i, count: h[i].count };
		return out;
	});

	const leakSlope = $derived.by(() => {
		const h = $goroutineHistory;
		if (h.length < 10) return 0;
		const recent = h.slice(-30);
		const n = recent.length;
		const mid = n >> 1;
		let s1 = 0; for (let i = 0; i < mid; i++) s1 += recent[i].count;
		let s2 = 0; for (let i = mid; i < n; i++) s2 += recent[i].count;
		return s2 / (n - mid) - s1 / mid;
	});

	const isLeaking = $derived.by(() => {
		const h = $goroutineHistory;
		if (h.length < 20) return false;
		const recent = h.slice(-60);
		let inc = 0;
		for (let i = 1; i < recent.length; i++) if (recent[i].count > recent[i-1].count) inc++;
		return inc > recent.length * 0.7;
	});

	const avgCount = $derived.by(() => {
		const h = $goroutineHistory;
		if (h.length === 0) return 0;
		let sum = 0; for (let i = 0; i < h.length; i++) sum += h[i].count;
		return Math.round(sum / h.length);
	});

	const maxCount = $derived.by(() => {
		const h = $goroutineHistory;
		if (h.length === 0) return 0;
		let m = h[0].count;
		for (let i = 1; i < h.length; i++) if (h[i].count > m) m = h[i].count;
		return m;
	});

	const topStates = $derived.by(() => {
		const d = $goroutineDump;
		if (!d?.states) return [] as [string, number][];
		return (Object.entries(d.states) as [string, number][]).sort((a,b) => b[1]-a[1]).slice(0,6);
	});

	const leakSeverity = $derived.by(() => {
		const s = leakSlope;
		if (s > 5) return 'critical';
		if (s > 2) return 'warning';
		if (s > 0.5) return 'watch';
		return 'stable';
	});

	const yMax = $derived.by(() => {
		const m = maxCount;
		return m > 0 ? Math.ceil(m * 1.15) : 10;
	});

	async function refreshGoroutines() {
		await mcpPoller.refreshGoroutines();
	}
</script>

<svelte:head>
	<title>Runtimes - Stackyrd</title>
	<meta name="description" content="Runtimes - Stackyrd" />
</svelte:head>

<PageHeader title="Runtimes" subtitle="Goroutine histogram & leak detection — 20min FIFO">
	<Button variant="outline" size="sm" onclick={refreshGoroutines} aria-label="Refresh goroutines">
		<RefreshCw class="h-4 w-4" />
		Refresh
	</Button>
</PageHeader>

{#if $goroutineDump === null}
	<div class="flex flex-col items-center justify-center py-20 gap-3" role="status" aria-label="Loading runtimes">
		<Spinner size="lg" />
		<button class="text-sm text-primary hover:underline font-semibold" onclick={refreshGoroutines}>Retry</button>
	</div>
{:else}
	<div class="space-y-6">
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<Card>
				<CardContent class="p-5">
					<div class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Current</div>
					<div class="mt-1 text-2xl font-bold tabular-nums">{$goroutineDump.count}</div>
					<div class="text-[11px] text-muted-foreground font-semibold">goroutines</div>
				</CardContent>
			</Card>
			<Card>
				<CardContent class="p-5">
					<div class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Peak (20min)</div>
					<div class="mt-1 text-2xl font-bold tabular-nums">{maxCount}</div>
					<div class="text-[11px] text-muted-foreground font-semibold">max observed</div>
				</CardContent>
			</Card>
			<Card>
				<CardContent class="p-5">
					<div class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Average</div>
					<div class="mt-1 text-2xl font-bold tabular-nums">{avgCount}</div>
					<div class="text-[11px] text-muted-foreground font-semibold">rolling mean</div>
				</CardContent>
			</Card>
			<Card class={isLeaking ? 'border-red-500' : ''}>
				<CardContent class="p-5">
					<div class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Leak Status</div>
					<div class="mt-1 flex items-center gap-2">
						{#if isLeaking}
							<AlertTriangle class="h-5 w-5 text-red-500" />
							<span class="text-lg font-bold text-red-500">LEAKING</span>
						{:else if leakSeverity === 'watch'}
							<span class="text-lg font-bold text-yellow-500">WATCH</span>
						{:else}
							<span class="text-lg font-bold text-green-500">STABLE</span>
						{/if}
					</div>
					<div class="text-[11px] text-muted-foreground font-semibold">
						Δ {leakSlope > 0 ? '+' : ''}{leakSlope.toFixed(1)} / window
					</div>
				</CardContent>
			</Card>
		</div>

		<Card>
			<CardHeader class="pb-3">
				<div class="flex items-center gap-2">
					<Activity class="h-4 w-4 text-primary" />
					<CardTitle class="text-sm font-semibold">Goroutine Count (20min FIFO)</CardTitle>
					<span class="text-[11px] font-semibold text-muted-foreground">● live from MCP • stackyrd_goroutines</span>
				</div>
			</CardHeader>
			<CardContent>
				<div bind:this={chartContainer}>
				{#if mounted && chartData.length > 1 && yMax > 0 && plotReady && PlotComp}
					<div class="w-full h-64">
						<PlotComp
							padding={40}
							height={260}
							x={{ axis: 'bottom', label: 'Time' }}
							y={{ domain: [0, yMax], axis: 'left', label: 'Goroutines' }}
						>
							<FrameComp />
							<GridYComp />
							<BarYComp data={chartData} x="idx" y="count" fill="#ed225d" fillOpacity={0.7} />
							<LineComp data={chartData} x="idx" y="count" stroke="#000" strokeWidth={1.5} curve="monotone-x" />
							<RuleYComp data={[avgCount]} stroke="#dfed33" strokeWidth={2} strokeDasharray="4 2" />
						</PlotComp>
					</div>
				{:else if chartData.length <= 1}
					<div class="flex items-center justify-center py-12 text-sm font-semibold text-muted-foreground">
						<Spinner size="sm" />
						<span class="ml-2">Collecting data points… ({chartData.length}/{MAX_POINTS})</span>
					</div>
				{:else}
					<div class="flex items-center justify-center py-12 text-sm font-semibold text-muted-foreground">
						<Spinner size="sm" />
						<span class="ml-2">Loading chart…</span>
					</div>
				{/if}
				</div>
				<div class="mt-3 flex items-center gap-4 text-[11px] font-semibold text-muted-foreground">
					<span class="flex items-center gap-1.5">
						<span class="inline-block h-2.5 w-2.5 rounded-sm bg-primary/70"></span> Count per poll
					</span>
					<span class="flex items-center gap-1.5">
						<span class="inline-block h-0.5 w-4 bg-black"></span> Trend line
					</span>
					<span class="flex items-center gap-1.5">
						<span class="inline-block h-0.5 w-4 bg-p5-yellow" style="border-top: 2px dashed #dfed33"></span> Rolling avg
					</span>
					<span class="ml-auto">{$goroutineHistory.length} points</span>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="pb-3">
				<CardTitle class="text-sm font-semibold">State Distribution</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
					{#each topStates as [state, count]}
						<div class="rounded-xl border-2 border-black p-3 bg-secondary/50">
							<div class="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground truncate" title={state}>
								{state.split(' ')[0]}
							</div>
							<div class="mt-1 text-lg font-bold tabular-nums">{count}</div>
							<div class="text-[10px] text-muted-foreground font-semibold">
								{((count / $goroutineDump.count) * 100).toFixed(0)}%
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>

		{#if isLeaking}
			<Card class="border-red-500 border-2">
				<CardHeader class="pb-3">
					<div class="flex items-center gap-2">
						<AlertTriangle class="h-4 w-4 text-red-500" />
						<CardTitle class="text-sm font-semibold text-red-500">Leak Detected</CardTitle>
						<Badge variant="error" class="ml-auto">SLOPE +{leakSlope.toFixed(1)}</Badge>
					</div>
				</CardHeader>
				<CardContent>
					<p class="text-sm font-semibold text-foreground">
						Goroutine count is trending upward over the observation window.
						Check goroutines in <code class="bg-muted px-1.5 py-0.5 rounded-full border border-black text-[11px] font-mono">chan receive</code>,
						<code class="bg-muted px-1.5 py-0.5 rounded-full border border-black text-[11px] font-mono">select</code>, or
						<code class="bg-muted px-1.5 py-0.5 rounded-full border border-black text-[11px] font-mono">IO wait</code> states — these are common leak sources.
					</p>
				</CardContent>
			</Card>
		{/if}
	</div>
{/if}
