<script lang="ts">
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
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { Plot, BarY, Line, RuleY, Frame, GridY, Text } from 'svelteplot';
	import { Activity, RefreshCw, AlertTriangle, Bug } from 'lucide-svelte';
	import type { GoroutineDataPoint } from '$lib/types/api';

	let now = $state(Date.now());

	$effect(() => {
		const ticker = setInterval(() => { now = Date.now(); }, 1000);
		return () => clearInterval(ticker);
	});

	const MAX_POINTS = 120;

	const chartData = $derived(
		$goroutineHistory.map((p, i) => ({
			idx: i,
			time: p.timestamp,
			count: p.count,
			label: formatTime(p.timestamp)
		}))
	);

	const leakSlope = $derived(() => {
		if ($goroutineHistory.length < 10) return 0;
		const recent = $goroutineHistory.slice(-30);
		const n = recent.length;
		const firstHalf = recent.slice(0, Math.floor(n / 2));
		const secondHalf = recent.slice(Math.floor(n / 2));
		const avgFirst = firstHalf.reduce((s, p) => s + p.count, 0) / firstHalf.length;
		const avgSecond = secondHalf.reduce((s, p) => s + p.count, 0) / secondHalf.length;
		return avgSecond - avgFirst;
	});

	const isLeaking = $derived(() => {
		if ($goroutineHistory.length < 20) return false;
		const recent = $goroutineHistory.slice(-60);
		let increases = 0;
		for (let i = 1; i < recent.length; i++) {
			if (recent[i].count > recent[i - 1].count) increases++;
		}
		return increases > recent.length * 0.7;
	});

	const avgCount = $derived(() => {
		if ($goroutineHistory.length === 0) return 0;
		return Math.round($goroutineHistory.reduce((s, p) => s + p.count, 0) / $goroutineHistory.length);
	});

	const maxCount = $derived(() => {
		if ($goroutineHistory.length === 0) return 0;
		return Math.max(...$goroutineHistory.map((p) => p.count));
	});

	const topStates = $derived(() => {
		if (!$goroutineDump || !$goroutineDump.states) return [];
		return Object.entries($goroutineDump.states)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 6);
	});

	const leakSeverity = $derived(() => {
		const slope = leakSlope();
		if (slope > 5) return 'critical';
		if (slope > 2) return 'warning';
		if (slope > 0.5) return 'watch';
		return 'stable';
	});

	function formatTime(ts: number): string {
		const d = new Date(ts);
		return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
	}

	function formatAgo(ts: number): string {
		const diff = Math.floor((now - ts) / 1000);
		if (diff < 60) return `${diff}s ago`;
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		return `${Math.floor(diff / 3600)}h ago`;
	}

	const yMax = $derived(() => {
		const m = maxCount();
		return m > 0 ? Math.ceil(m * 1.15) : 10;
	});

	async function refreshGoroutines() {
		await mcpPoller.refreshGoroutines();
	}
</script>

<PageHeader title="Runtimes" subtitle="Goroutine histogram & leak detection — last hour FIFO">
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
					<div class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Peak (1h)</div>
					<div class="mt-1 text-2xl font-bold tabular-nums">{maxCount()}</div>
					<div class="text-[11px] text-muted-foreground font-semibold">max observed</div>
				</CardContent>
			</Card>
			<Card>
				<CardContent class="p-5">
					<div class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Average</div>
					<div class="mt-1 text-2xl font-bold tabular-nums">{avgCount()}</div>
					<div class="text-[11px] text-muted-foreground font-semibold">rolling mean</div>
				</CardContent>
			</Card>
			<Card class={isLeaking() ? 'border-red-500' : ''}>
				<CardContent class="p-5">
					<div class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Leak Status</div>
					<div class="mt-1 flex items-center gap-2">
						{#if isLeaking()}
							<AlertTriangle class="h-5 w-5 text-red-500" />
							<span class="text-lg font-bold text-red-500">LEAKING</span>
						{:else if leakSeverity() === 'watch'}
							<span class="text-lg font-bold text-yellow-500">WATCH</span>
						{:else}
							<span class="text-lg font-bold text-green-500">STABLE</span>
						{/if}
					</div>
					<div class="text-[11px] text-muted-foreground font-semibold">
						Δ {leakSlope() > 0 ? '+' : ''}{leakSlope().toFixed(1)} / window
					</div>
				</CardContent>
			</Card>
		</div>

		<Card>
			<CardHeader class="pb-3">
				<div class="flex items-center gap-2">
					<Activity class="h-4 w-4 text-primary" />
					<CardTitle class="text-sm font-semibold">Goroutine Count (1h FIFO)</CardTitle>
					<span class="text-[11px] font-semibold text-muted-foreground">● live from MCP • stackyrd_goroutines</span>
				</div>
			</CardHeader>
			<CardContent>
				{#if chartData.length > 1}
					<div class="w-full h-64">
						<Plot
							padding={40}
							height={260}
							x={{ axis: 'bottom', label: 'Time', tickFormat: ((d: unknown) => chartData[d as number]?.label ?? '') as never, tickRotate: -45 }}
							y={{ domain: [0, yMax()], axis: 'left', label: 'Goroutines' }}
						>
							<Frame />
							<GridY />
							<BarY data={chartData} x="idx" y="count" fill="#ed225d" fillOpacity={0.7} />
							<Line data={chartData} x="idx" y="count" stroke="#000" strokeWidth={1.5} curve="monotone-x" />
							<RuleY data={[avgCount()]} stroke="#dfed33" strokeWidth={2} strokeDasharray="4 2" />
							<Text
								data={[{ idx: chartData.length - 1, count: avgCount(), label: `avg ${avgCount()}` }]}
								x="idx"
								y="count"
								text="label"
								fontSize={10}
								fontWeight={600}
								fill="#000"
								dy={-8}
								textAnchor="end"
							/>
						</Plot>
					</div>
				{:else}
					<div class="flex items-center justify-center py-12 text-sm font-semibold text-muted-foreground">
						<Spinner size="sm" />
						<span class="ml-2">Collecting data points… ({chartData.length}/{MAX_POINTS})</span>
					</div>
				{/if}
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
					<span class="ml-auto">{$goroutineHistory.length} points • {$goroutineHistory.length > 0 ? formatAgo($goroutineHistory[0].timestamp) : '—'} to now</span>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="pb-3">
				<CardTitle class="text-sm font-semibold">State Distribution</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
					{#each topStates() as [state, count]}
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

		{#if isLeaking()}
			<Card class="border-red-500 border-2">
				<CardHeader class="pb-3">
					<div class="flex items-center gap-2">
						<AlertTriangle class="h-4 w-4 text-red-500" />
						<CardTitle class="text-sm font-semibold text-red-500">Leak Detected</CardTitle>
						<Badge variant="error" class="ml-auto">SLOPE +{leakSlope().toFixed(1)}</Badge>
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
