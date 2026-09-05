<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import { ScrollText, Pause, Play, Trash2, Download, Timer, ChevronDown } from 'lucide-svelte';
	import { logStore } from '$lib/stores/logs';

	let filter = $state<string>('all');
	let search = $state('');
	let debouncedSearch = $state('');
	let autoScroll = $state(true);
	let logContainer: HTMLDivElement | null = null;
	let visibleCount = $state(200);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let reducedMotion = $state(false);

	const intervalOptions: Array<{ value: number; label: string }> = [
		{ value: 100, label: 'Realtime' },
		{ value: 500, label: '500ms' },
		{ value: 1000, label: '1000ms' },
		{ value: 2000, label: '2000ms' },
		{ value: 5000, label: '5000ms' }
	];

	onMount(() => {
		logStore.start();
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.hasAttribute('data-disable-anim');
	});

	$effect(() => {
		void search;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => { debouncedSearch = search; visibleCount = 200; }, 200);
	});

	$effect(() => {
		if (autoScroll && logContainer && $logStore.logs.length) {
			queueMicrotask(() => {
				if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
			});
		}
	});

	$effect(() => {
		void filter; void debouncedSearch;
		visibleCount = 200;
	});

	const filteredLogs = $derived.by(() => {
		const logs = $logStore.logs;
		const q = debouncedSearch.toLowerCase();
		const f = filter;
		if (f === 'all' && !q) return logs;
		const out: typeof logs = [];
		for (let i = 0; i < logs.length; i++) {
			const log = logs[i];
			if (f !== 'all' && log.level !== f) continue;
			if (q && !log.message.toLowerCase().includes(q)) continue;
			out.push(log);
		}
		return out;
	});

	const displayLogs = $derived(filteredLogs.slice(-visibleCount));

	function loadMore() {
		visibleCount = Math.min(visibleCount + 200, filteredLogs.length);
	}

	function handleScroll(e: Event) {
		const target = e.target as HTMLDivElement;
		autoScroll = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
		if (target.scrollTop < 200 && visibleCount < filteredLogs.length) {
			loadMore();
		}
	}

	function levelColor(level: string) {
		switch (level) {
			case 'error': return 'text-red-400';
			case 'warn': return 'text-amber-400';
			case 'info': return 'text-sky-400';
			default: return 'text-zinc-400';
		}
	}

	const filters: Array<[string, string]> = [['all', 'All'], ['debug', 'Debug'], ['info', 'Info'], ['warn', 'Warn'], ['error', 'Error']];
</script>

<PageHeader title="Logs" subtitle="Live log stream — {$logStore.realtime ? 'realtime (100ms)' : `buffered every ${$logStore.streamInterval}ms`}">
	<div class="flex flex-wrap items-center gap-2">
		<div class="flex items-center gap-2 rounded-full border-2 border-black bg-white px-2 py-1 shadow-sm dark:bg-black dark:border-zinc-700">
			<Timer class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
			<label for="log-interval" class="text-xs font-bold uppercase tracking-wide">Interval</label>
			<div class="relative">
				<select
					id="log-interval"
					value={$logStore.streamInterval}
					onchange={(e) => logStore.setInterval(Number((e.target as HTMLSelectElement).value))}
					class="appearance-none bg-transparent pr-6 pl-2 py-0.5 text-xs font-bold rounded-full focus:outline-none cursor-pointer"
					aria-label="Stream interval"
				>
					{#each intervalOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
				<ChevronDown class="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" aria-hidden="true" />
			</div>
		</div>
		<Button variant="outline" size="sm" onclick={() => logStore.clear()} aria-label="Clear logs">
			<Trash2 class="h-4 w-4" />
			Clear
		</Button>
		<Button variant="outline" size="sm" onclick={() => logStore.exportLogs()} aria-label="Export logs">
			<Download class="h-4 w-4" />
			Export
		</Button>
		<Button variant={$logStore.paused ? "default" : "outline"} size="sm" onclick={() => logStore.setPaused(!$logStore.paused)} aria-pressed={$logStore.paused}>
			{#if $logStore.paused}<Play class="h-4 w-4" />{:else}<Pause class="h-4 w-4" />{/if}
			{$logStore.paused ? 'Resume' : 'Pause'}
		</Button>
	</div>
</PageHeader>

<div class="flex flex-col sm:flex-row gap-3 mb-4">
	<Input type="text" placeholder="Search logs... (debounced 200ms)" bind:value={search} class="flex-1" aria-label="Search logs" />
	<div class="flex flex-wrap gap-1" role="group" aria-label="Filter by level">
		{#each filters as [value, label]}
			<Button
				variant={filter === value ? "default" : "outline"}
				size="sm"
				onclick={() => filter = value}
				aria-pressed={filter === value}
			>
				{label}
			</Button>
		{/each}
	</div>
</div>

<Card class="p-0 overflow-hidden border-2 border-black bg-black">
	<div
		class="h-[60vh] overflow-y-auto font-mono text-xs bg-black text-white"
		bind:this={logContainer}
		onscroll={handleScroll}
	>
		{#if filteredLogs.length === 0}
			<div class="flex flex-col items-center justify-center h-full text-zinc-400 py-12 gap-3">
				<span class="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border-2 border-zinc-800">
					<ScrollText class="h-6 w-6 text-zinc-500" aria-hidden="true" />
				</span>
				<p class="text-sm font-mono font-semibold">No log entries to display</p>
				<p class="text-xs font-mono text-zinc-500">{$logStore.realtime ? 'Realtime (100ms) — flush every 100ms' : `Buffer flush every ${$logStore.streamInterval}ms`} — {$logStore.buffer.length} buffered • {$logStore.connectionStatus}</p>
			</div>
		{:else}
			{#if filteredLogs.length > visibleCount}
				<div class="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-6 py-2 text-center">
					<button class="text-[11px] font-semibold text-zinc-400 hover:text-white" onclick={loadMore}>
						Load {Math.min(200, filteredLogs.length - visibleCount)} more (showing {displayLogs.length}/{filteredLogs.length})
					</button>
				</div>
			{/if}
			{#each displayLogs as entry, i (i + '|' + entry.timestamp + '|' + entry.message)}
				<div
					class="flex items-start gap-3 px-6 py-3 hover:bg-zinc-900 border-b border-zinc-800 last:border-0"
				>
					<span class="text-zinc-500 shrink-0 w-20 tabular-nums font-mono">{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ''}</span>
					<span class="shrink-0 w-12 uppercase font-bold tracking-wide {levelColor(entry.level)}">{entry.level}</span>
					{#if entry.source}
						<span class="text-violet-400 shrink-0 font-bold">[{entry.source}]</span>
					{/if}
					<span class="text-white break-all font-medium leading-relaxed">{entry.message}</span>
				</div>
			{/each}
		{/if}
	</div>
</Card>

<p class="mt-2 text-xs font-mono text-muted-foreground">
	Showing {displayLogs.length}/{filteredLogs.length} of {$logStore.logs.length} • {$logStore.buffer.length} buffered • {$logStore.realtime ? 'realtime (100ms)' : `interval ${$logStore.streamInterval}ms`} • {$logStore.paused ? 'paused' : 'live'} • {$logStore.connectionStatus}
	{#if filteredLogs.length > visibleCount} • scroll to top to load more{/if}
</p>
