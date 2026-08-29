<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import { ScrollText, Pause, Play, Trash2, Download, Timer, ChevronDown } from 'lucide-svelte';
	import type { LogEntry } from '$lib/types/api';
	import { animate } from "motion";

	let logs = $state<LogEntry[]>([]);
	let buffer: LogEntry[] = $state([]);
	let filter = $state<string>('all');
	let search = $state('');
	let paused = $state(false);
	let autoScroll = $state(true);
	let streamInterval = $state<number>(1000);
	let eventSource: EventSource | null = null;
	let logContainer: HTMLDivElement | null = null;
	let flushTimer: ReturnType<typeof setInterval> | null = null;

	const intervalOptions = [500, 1000, 2000, 5000];

	onMount(() => {
		connectStream();
		startFlushTimer();
	});

	onDestroy(() => {
		if (eventSource) eventSource.close();
		if (reconnectTimer) clearTimeout(reconnectTimer);
		if (flushTimer) clearInterval(flushTimer);
	});

	$effect(() => {
		streamInterval;
		startFlushTimer();
	});

	function startFlushTimer() {
		if (flushTimer) clearInterval(flushTimer);
		flushTimer = setInterval(() => {
			if (paused || buffer.length === 0) return;
			const toAdd = buffer.splice(0, buffer.length);
			logs = [...logs.slice(-500 + toAdd.length), ...toAdd].slice(-500);
			if (autoScroll && logContainer) {
				logContainer.scrollTop = logContainer.scrollHeight;
			}
		}, streamInterval);
	}

	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let reconnectAttempts = 0;

	function connectStream() {
		if (reconnectTimer) clearTimeout(reconnectTimer);
		const streamId = 'dashboard-logs';
		eventSource = new EventSource(`/api/v1/events/stream/${streamId}`);
		eventSource.onopen = () => {
			reconnectAttempts = 0;
		};
		eventSource.onmessage = (event) => {
			if (paused) return;
			try {
				const raw = JSON.parse(event.data) as Record<string, unknown>;
				const entry: LogEntry = {
					timestamp: (raw.timestamp as string) ?? (raw.Timestamp as string) ?? new Date().toISOString(),
					level: ((raw.level as string) ?? (raw.Type as string) ?? (raw.type as string) ?? 'info').toLowerCase() as LogEntry['level'],
					message: (raw.message as string) ?? (raw.Message as string) ?? String(raw.data ?? ''),
					source: (raw.source as string) ?? (raw.StreamID as string) ?? (raw.stream_id as string) ?? (raw.Data as Record<string, unknown>)?.source as string ?? undefined
				};
				if (!entry.message) return;
				buffer.push(entry);
				if (streamInterval <= 500) {
					const toAdd = buffer.splice(0, buffer.length);
					logs = [...logs.slice(-500 + toAdd.length), ...toAdd].slice(-500);
					if (autoScroll && logContainer) logContainer.scrollTop = logContainer.scrollHeight;
				}
			} catch {}
		};
		eventSource.onerror = () => {
			eventSource?.close();
			eventSource = null;
			if (reconnectAttempts < 5) {
				const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
				reconnectAttempts++;
				reconnectTimer = setTimeout(connectStream, delay);
			}
		};
	}

	function exportLogs() {
		const data = logs.map((l) => JSON.stringify(l)).join('\n');
		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `stackyrd-logs-${new Date().toISOString()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const filteredLogs = $derived(
		logs.filter((log) => {
			if (filter !== 'all' && log.level !== filter) return false;
			if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
			return true;
		})
	);

	function levelColor(level: string) {
		switch (level) {
			case 'error': return 'text-red-400';
			case 'warn': return 'text-amber-400';
			case 'info': return 'text-sky-400';
			default: return 'text-zinc-400';
		}
	}

	const filters: Array<[string, string]> = [['all', 'All'], ['debug', 'Debug'], ['info', 'Info'], ['warn', 'Warn'], ['error', 'Error']];

	function animateRow(node: HTMLDivElement) {
		const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (prefersReduced) return;
 // -ignore
		(animate as any)(node as any, { opacity: [0, 1], x: [-8, 0] }, { duration: 0.25, easing: "ease-out" });
	}
</script>

<PageHeader title="Logs" subtitle="Live log stream — buffered every {streamInterval}ms">
	<div class="flex flex-wrap items-center gap-2">
		<div class="flex items-center gap-2 rounded-full border-2 border-black bg-white px-2 py-1 shadow-sm dark:bg-black dark:border-zinc-700">
			<Timer class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
			<label for="log-interval" class="text-xs font-bold uppercase tracking-wide">Interval</label>
			<div class="relative">
				<select
					id="log-interval"
					bind:value={streamInterval}
					class="appearance-none bg-transparent pr-6 pl-2 py-0.5 text-xs font-bold rounded-full focus:outline-none cursor-pointer"
					aria-label="Stream interval"
				>
					{#each intervalOptions as ms}
						<option value={ms}>{ms}ms</option>
					{/each}
				</select>
				<ChevronDown class="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" aria-hidden="true" />
			</div>
		</div>
		<Button variant="outline" size="sm" onclick={() => { logs = []; buffer = []; }} aria-label="Clear logs">
			<Trash2 class="h-4 w-4" />
			Clear
		</Button>
		<Button variant="outline" size="sm" onclick={exportLogs} aria-label="Export logs">
			<Download class="h-4 w-4" />
			Export
		</Button>
		<Button variant={paused ? "default" : "outline"} size="sm" onclick={() => paused = !paused} aria-pressed={paused}>
			{#if paused}<Play class="h-4 w-4" />{:else}<Pause class="h-4 w-4" />{/if}
			{paused ? 'Resume' : 'Pause'}
		</Button>
	</div>
</PageHeader>

<div class="flex flex-col sm:flex-row gap-3 mb-4">
	<Input type="text" placeholder="Search logs..." bind:value={search} class="flex-1" aria-label="Search logs" />
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
		onscroll={(e) => {
			const target = e.target as HTMLDivElement;
			autoScroll = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
		}}
	>
		{#if filteredLogs.length === 0}
			<div class="flex flex-col items-center justify-center h-full text-zinc-400 py-12 gap-3">
				<span class="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border-2 border-zinc-800">
					<ScrollText class="h-6 w-6 text-zinc-500" aria-hidden="true" />
				</span>
				<p class="text-sm font-mono font-semibold">No log entries to display</p>
				<p class="text-xs font-mono text-zinc-500">Buffer flush every {streamInterval}ms — {buffer.length} buffered</p>
			</div>
		{:else}
			{#each filteredLogs as entry, i (i)}
				<div
					class="flex items-start gap-3 px-6 py-3 hover:bg-zinc-900 border-b border-zinc-800 last:border-0 transition-colors"
					{@attach (node) => animateRow(node as HTMLDivElement)}
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
	Showing {filteredLogs.length} of {logs.length} • {buffer.length} buffered • interval {streamInterval}ms • {paused ? 'paused' : 'live'}
</p>
