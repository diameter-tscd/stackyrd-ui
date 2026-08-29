import { writable, derived, type Readable } from 'svelte/store';
import type { LogEntry } from '$lib/types/api';

export interface LogState {
	logs: LogEntry[];
	buffer: LogEntry[];
	paused: boolean;
	streamInterval: number;
	connectionStatus: 'connecting' | 'open' | 'closed' | 'error';
}

const MAX_LOGS = 2000;

function createLogStore() {
	const { subscribe, update } = writable<LogState>({
		logs: [],
		buffer: [],
		paused: false,
		streamInterval: 1000,
		connectionStatus: 'closed'
	});

	let eventSource: EventSource | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let reconnectAttempts = 0;
	let flushTimer: number | null = null;
	let isStarted = false;

	function getInterval(): number {
		let val = 1000;
		const unsub = subscribe((s) => { val = s.streamInterval; });
		unsub();
		return val;
	}

	function startFlushTimer() {
		if (flushTimer) clearInterval(flushTimer);
		const tick = () => {
			update((s) => {
				if (s.paused || s.buffer.length === 0) return s;
				const toAdd = s.buffer.splice(0, s.buffer.length);
				const next = [...s.logs.slice(-MAX_LOGS + toAdd.length), ...toAdd].slice(-MAX_LOGS);
				return { ...s, logs: next, buffer: [] };
			});
		};
		const ms = getInterval();
		flushTimer = window.setInterval(tick, ms);
	}

	function connectStream() {
		if (typeof window === 'undefined') return;
		if (reconnectTimer) clearTimeout(reconnectTimer);
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		const streamId = 'dashboard-logs';
		eventSource = new EventSource(`/api/v1/events/stream/${streamId}`);
		eventSource.onopen = () => {
			reconnectAttempts = 0;
			update((s) => ({ ...s, connectionStatus: 'open' }));
		};
		eventSource.onmessage = (event) => {
			try {
				const raw = JSON.parse(event.data) as Record<string, unknown>;
				const entry: LogEntry = {
					timestamp: (raw.timestamp as string) ?? (raw.Timestamp as string) ?? new Date().toISOString(),
					level: ((raw.level as string) ?? (raw.Type as string) ?? (raw.type as string) ?? 'info').toLowerCase() as LogEntry['level'],
					message: (raw.message as string) ?? (raw.Message as string) ?? String(raw.data ?? ''),
					source: (raw.source as string) ?? (raw.StreamID as string) ?? (raw.stream_id as string) ?? (raw.Data as Record<string, unknown>)?.source as string ?? undefined
				};
				if (!entry.message) return;
				update((s) => {
					if (s.streamInterval <= 500) {
						const next = [...s.logs.slice(-MAX_LOGS + 1), entry].slice(-MAX_LOGS);
						return { ...s, logs: next };
					}
					return { ...s, buffer: [...s.buffer, entry] };
				});
			} catch {}
		};
		eventSource.onerror = () => {
			eventSource?.close();
			eventSource = null;
			update((s) => ({ ...s, connectionStatus: 'error' }));
			if (reconnectAttempts < 10) {
				const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 15000);
				reconnectAttempts++;
				reconnectTimer = setTimeout(connectStream, delay);
			}
		};
	}

	function start() {
		if (isStarted) return;
		isStarted = true;
		connectStream();
		startFlushTimer();
	}

	function stop() {
		if (!isStarted) return;
		isStarted = false;
		if (eventSource) eventSource.close();
		if (reconnectTimer) clearTimeout(reconnectTimer);
		if (flushTimer) clearInterval(flushTimer);
		eventSource = null;
		flushTimer = null;
		reconnectTimer = null;
	}

	function clear() {
		update((s) => ({ ...s, logs: [], buffer: [] }));
	}

	function setPaused(paused: boolean) {
		update((s) => ({ ...s, paused }));
	}

	function setInterval(ms: number) {
		update((s) => ({ ...s, streamInterval: ms }));
		if (flushTimer) clearInterval(flushTimer);
		startFlushTimer();
	}

	function exportLogs() {
		let data = '';
		const unsub = subscribe((s) => {
			data = s.logs.map((l) => JSON.stringify(l)).join('\n');
		});
		unsub();
		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `stackyrd-logs-${new Date().toISOString()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	return {
		subscribe,
		start,
		stop,
		clear,
		setPaused,
		setInterval,
		exportLogs
	};
}

export const logStore = createLogStore();

export const logCount: Readable<number> = derived(logStore, ($s) => $s.logs.length);
export const bufferedCount: Readable<number> = derived(logStore, ($s) => $s.buffer.length);
