<script lang="ts">
	import type { MemoryData, MemoryThreshold } from '$lib/types/api';
	import Card from './Card.svelte';
	import CardHeader from './card-header.svelte';
	import CardTitle from './card-title.svelte';
	import CardContent from './card-content.svelte';
	import Spinner from './Spinner.svelte';
	import { MemoryStick, RefreshCw } from 'lucide-svelte';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import { mcpPoller } from '$lib/stores/mcpPoller';
	import { onMount } from 'svelte';

	let { data }: { data: MemoryData | null } = $props();

	let PlotComp: any = $state(null);
	let BarYComp: any = $state(null);
	let BarXComp: any = $state(null);
	let TextComp: any = $state(null);
	let FrameComp: any = $state(null);
	let GridYComp: any = $state(null);
	let plotReady = $state(false);
	let visible = $state(false);
	let container: HTMLDivElement | undefined = $state(undefined);
	let refreshing = $state(false);

	onMount(() => {
		if (!container) return;
		const obs = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					visible = true;
					obs.disconnect();
				}
			},
			{ rootMargin: '200px' }
		);
		obs.observe(container);
		return () => obs.disconnect();
	});

	$effect(() => {
		if (!visible || plotReady || !data) return;
		(async () => {
			const mod = await import('svelteplot');
			PlotComp = mod.Plot;
			BarYComp = mod.BarY;
			BarXComp = mod.BarX;
			TextComp = mod.Text;
			FrameComp = mod.Frame;
			GridYComp = mod.GridY;
			plotReady = true;
		})();
	});

	async function refresh() {
		if (refreshing) return;
		refreshing = true;
		try { await mcpPoller.refreshMemory(); } finally { refreshing = false; }
	}

	const gaugeData = $derived.by(() => {
		if (!data) return [];
		const pct = data.used_percent ?? 0;
		return [
			{ label: 'Used', value: pct, fill: data.status?.color ?? '#22c55e' },
			{ label: 'Free', value: 100 - pct, fill: 'rgba(0,0,0,0.08)' }
		];
	});

	const barData = $derived.by(() => {
		if (!data) return [];
		return [
			{ label: 'Used', value: data.system.used_mib, fill: data.status?.color ?? '#22c55e' },
			{ label: 'Cached', value: data.system.cached_mib, fill: '#3b82f6' },
			{ label: 'Buffers', value: data.system.buffers_mib, fill: '#8b5cf6' },
			{ label: 'Free', value: data.system.free_mib, fill: 'rgba(0,0,0,0.08)' }
		];
	});

	const appData = $derived.by(() => {
		if (!data) return [];
		return [
			{ label: 'Heap Inuse', value: data.app.heap_inuse_mib, fill: '#f59e0b' },
			{ label: 'Heap Alloc', value: data.app.heap_alloc_mib, fill: '#3b82f6' },
			{ label: 'Stack', value: data.app.stack_inuse_mib, fill: '#8b5cf6' },
			{ label: 'Sys', value: data.app.sys_mib, fill: '#ef4444' }
		];
	});
</script>

<div bind:this={container}>
<Card>
	<CardHeader class="pb-3">
		<div class="flex items-center gap-2">
			<MemoryStick class="h-5 w-5 text-blue-500" aria-hidden="true" />
			<CardTitle class="text-sm font-semibold">Memory Usage</CardTitle>
			{#if data}
				<Badge class="font-semibold border-black" variant="outline">
					{data.status?.label ?? '—'}
				</Badge>
			{/if}
			<span class="text-[11px] font-semibold tracking-wide text-muted-foreground">via stackyrd_memory • threshold scale</span>
			<Button variant="outline" size="sm" class="ml-auto rounded-full h-7 px-2.5 border-black" onclick={refresh} disabled={refreshing} aria-label="Refresh memory">
				<RefreshCw class="h-3.5 w-3.5 {refreshing ? 'animate-spin' : ''}" />
				{refreshing ? 'Refreshing' : 'Refresh'}
			</Button>
		</div>
	</CardHeader>
	<CardContent>
		{#if data === null}
			<div class="flex items-center gap-2 py-6 text-sm font-semibold text-muted-foreground">
				<Spinner size="sm" />
				<span>Loading memory…</span>
			</div>
		{:else if !plotReady || !PlotComp}
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div class="flex flex-col items-center justify-center">
					<span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">System Memory</span>
					<div class="w-full h-10 rounded-full bg-muted overflow-hidden"><div class="h-full" style="width: {data.used_percent}%; background: {data.status?.color ?? '#22c55e'}"></div></div>
					<div class="mt-1 text-sm font-bold">{data.used_percent.toFixed(1)}%</div>
					<div class="mt-2 flex items-center gap-1">
						{#each data.visualization.thresholds as t}
							<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border" style="background: {t.bg}; color: {t.color}; border-color: {t.color}">
								{t.label} {t.min}–{t.max}%
							</span>
						{/each}
					</div>
				</div>
				<div>
					<span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2 block">System Breakdown (MiB)</span>
					<div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground">
						<span>Total: {data.system.total_mib} MiB ({data.system.total_gib.toFixed(2)} GiB)</span>
						<span>Used: {data.system.used_mib} MiB</span>
						<span>Available: {data.system.available_mib} MiB</span>
						<span>Free: {data.system.free_mib} MiB</span>
					</div>
				</div>
				<div>
					<span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2 block">App Runtime (MiB)</span>
					<div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground">
						<span>Alloc: {data.app.alloc_mib} MiB</span>
						<span>Heap: {data.app.heap_inuse_mib} MiB</span>
						<span>Stack: {data.app.stack_inuse_mib} MiB</span>
						<span>GC cycles: {data.app.num_gc}</span>
						<span>Goroutines: {data.app.num_goroutine}</span>
						<span>Self: {data.app.self_mib} MiB</span>
					</div>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div class="flex flex-col items-center justify-center">
					<span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">System Memory</span>
					<div class="w-full h-48">
						<PlotComp
							padding={0}
							height={180}
							x={{ domain: [0, 100], axis: false }}
							y={{ axis: false }}
						>
							<FrameComp />
							<BarXComp data={gaugeData} x="value" y="label" fill="fill" />
							<TextComp
								data={[{ value: 50, label: `${data.used_percent.toFixed(1)}%` }]}
								x="value"
								y="label"
								text="label"
								fontSize={20}
								fontWeight={700}
								fill={data.status?.color ?? '#22c55e'}
								textAnchor="middle"
								dy={8}
							/>
						</PlotComp>
					</div>
					<div class="mt-2 flex items-center gap-1">
						{#each data.visualization.thresholds as t}
							<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border" style="background: {t.bg}; color: {t.color}; border-color: {t.color}">
								{t.label} {t.min}–{t.max}%
							</span>
						{/each}
					</div>
				</div>

				<div>
					<span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2 block">System Breakdown (MiB)</span>
					<div class="w-full h-48">
						<PlotComp
							padding={0}
							height={180}
							x={{ axis: 'bottom', label: 'MiB' }}
							y={{ axis: 'left', label: '' }}
						>
							<FrameComp />
							<GridYComp />
							<BarYComp data={barData} x="label" y="value" fill="fill" />
						</PlotComp>
					</div>
					<div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground">
						<span>Total: {data.system.total_mib} MiB ({data.system.total_gib.toFixed(2)} GiB)</span>
						<span>Used: {data.system.used_mib} MiB</span>
						<span>Available: {data.system.available_mib} MiB</span>
						<span>Free: {data.system.free_mib} MiB</span>
					</div>
				</div>

				<div>
					<span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2 block">App Runtime (MiB)</span>
					<div class="w-full h-48">
						<PlotComp
							padding={0}
							height={180}
							x={{ axis: 'bottom', label: 'MiB' }}
							y={{ axis: 'left', label: '' }}
						>
							<FrameComp />
							<GridYComp />
							<BarYComp data={appData} x="label" y="value" fill="fill" />
						</PlotComp>
					</div>
					<div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground">
						<span>Alloc: {data.app.alloc_mib} MiB</span>
						<span>Heap: {data.app.heap_inuse_mib} MiB</span>
						<span>Stack: {data.app.stack_inuse_mib} MiB</span>
						<span>GC cycles: {data.app.num_gc}</span>
						<span>Goroutines: {data.app.num_goroutine}</span>
						<span>Self: {data.app.self_mib} MiB</span>
					</div>
				</div>
			</div>
		{/if}
	</CardContent>
</Card>
</div>
