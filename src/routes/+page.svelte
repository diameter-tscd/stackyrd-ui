<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { health, services, infra, mcpUptime, resources, instanceIdentity, memory, mcpInstanceId, connectionStatus } from '$lib/stores/data';
	import { mcpPoller } from '$lib/stores/mcpPoller';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardTitle from '$lib/components/ui/card-title.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Alert from '$lib/components/ui/alert.svelte';
	import AlertTitle from '$lib/components/ui/alert-title.svelte';
	import AlertDescription from '$lib/components/ui/alert-description.svelte';
	import { Server, HardDrive, AlertTriangle, Activity, Cpu, MemoryStick, Hash, Boxes, Monitor, Fingerprint, Globe, Building2, HardDriveIcon as DriveIcon, RefreshCw } from 'lucide-svelte';
	import MemoryViz from '$lib/components/ui/MemoryViz.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let ticker: ReturnType<typeof setInterval> | null = null;
	let rafId: number | null = null;
	let now = $state(Date.now());
	let firstSeenAt = $state<number | null>(null);
	let lastTick = 0;
	let refreshingResources = $state(false);

	function tickLoop(ts: number) {
		if (document.hidden) { rafId = requestAnimationFrame(tickLoop); return; }
		if (ts - lastTick >= 1000) { lastTick = ts; now = Date.now(); }
		rafId = requestAnimationFrame(tickLoop);
	}

	onMount(() => {
		if ($auth.authenticated && firstSeenAt === null) firstSeenAt = Date.now();
		rafId = requestAnimationFrame(tickLoop);
	});

	onDestroy(() => {
		if (ticker) clearInterval(ticker);
		if (rafId !== null) cancelAnimationFrame(rafId);
	});

	$effect(() => {
		if ($auth.authenticated && firstSeenAt === null) firstSeenAt = Date.now();
		if (!$auth.authenticated && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
		else if ($auth.authenticated && rafId === null) { lastTick = performance.now(); rafId = requestAnimationFrame(tickLoop); }
	});

	const runningServices = $derived.by(() => { let n=0; for (const s of $services) if (s.status==='running') n++; return n; });
	const failedServices = $derived.by(() => { let n=0; for (const s of $services) if (s.status==='failed') n++; return n; });
	const connectedInfra = $derived.by(() => { let n=0; for (const i of $infra) if (i.status==='connected') n++; return n; });
	const healthStatus = $derived($health?.server_ready ? 'Ready' : ($health?.status === 'ready' ? 'Ready' : 'Initializing'));

	const durationCache = new Map<string, number | null>();
	function parseGoDuration(input: string): number | null {
		if (durationCache.has(input)) return durationCache.get(input)!;
		const s = input.trim();
		if (!s) { durationCache.set(input, null); return null; }
		if (/^\d+$/.test(s)) { const v = Number(s) * 1000; durationCache.set(input, v); return v; }
		if (/^\d+(\.\d+)?s$/.test(s) && !/[mhd]/.test(s)) {
			const n = Number(s.slice(0, -1));
			const v = Number.isFinite(n) ? n * 1000 : null;
			durationCache.set(input, v);
			return v;
		}
		const re = /(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h|d)/g;
		let ms = 0;
		let matched = false;
		let m: RegExpExecArray | null;
		while ((m = re.exec(s)) !== null) {
			matched = true;
			const val = Number(m[1]);
			const unit = m[2];
			if (!Number.isFinite(val)) { durationCache.set(input, null); return null; }
			switch (unit) {
				case 'ns': ms += val / 1e6; break;
				case 'us':
				case 'µs': ms += val / 1000; break;
				case 'ms': ms += val; break;
				case 's': ms += val * 1000; break;
				case 'm': ms += val * 60000; break;
				case 'h': ms += val * 3600000; break;
				case 'd': ms += val * 86400000; break;
			}
		}
		const out = matched ? ms : null;
		if (durationCache.size > 200) durationCache.clear();
		durationCache.set(input, out);
		return out;
	}

	function parseTimestampMs(input: unknown): number | null {
		if (typeof input !== 'string' || !input) return null;
		const t = Date.parse(input);
		return Number.isFinite(t) ? t : null;
	}

	function baseUptimeMs(h: typeof $health): number | null {
		if (!h) return null;
		const raw = h as Record<string, unknown>;
		const candidates: unknown[] = [raw.uptime, raw.uptime_seconds, raw.uptimeSeconds, raw.uptimeMs, raw.duration, raw.elapsed];
		for (const c of candidates) {
			if (typeof c === 'number' && Number.isFinite(c)) return c * 1000;
			if (typeof c === 'string') {
				const p = parseGoDuration(c);
				if (p !== null) return p;
				const sec = Number(c);
				if (Number.isFinite(sec) && String(sec) === c.trim()) return sec * 1000;
			}
		}
		const tsCandidates = [raw.started_at, raw.startedAt, raw.start_time, raw.boot_time, raw.startTime, raw.bootTime, raw.launched_at];
		for (const c of tsCandidates) {
			const t = parseTimestampMs(c);
			if (t !== null) return Date.now() - t;
		}
		return null;
	}

	const rawUptimeMs = $derived(baseUptimeMs($health));

	const healthUptimeMs = $derived.by(() => {
		const base = rawUptimeMs;
		if (base !== null) return base;
		return null;
	});

	const mcpUptimeMs = $derived.by(() => {
		const u = $mcpUptime;
		if (!u) return null;
		const startMs = parseTimestampMs(u.started_at);
		if (startMs !== null) return now - startMs;
		if (typeof u.uptime_seconds === 'number' && Number.isFinite(u.uptime_seconds)) {
			return u.uptime_seconds * 1000 + (mcpPoller.uptimeFetchedAt !== null ? now - mcpPoller.uptimeFetchedAt : 0);
		}
		if (typeof u.uptime === 'string') {
			const p = parseGoDuration(u.uptime);
			if (p !== null) return p + (mcpPoller.uptimeFetchedAt !== null ? now - mcpPoller.uptimeFetchedAt : 0);
		}
		if (typeof (u as unknown as Record<string, unknown>).started_at_unix === 'number') {
			const unix = (u as unknown as Record<string, unknown>).started_at_unix as number;
			return now - unix * 1000;
		}
		return null;
	});

	const uptimeMs = $derived(mcpUptimeMs ?? healthUptimeMs ?? (firstSeenAt !== null ? now - firstSeenAt : null));

	function formatDuration(ms: number | null): string {
		if (ms === null || ms < 0) return '—';
		const totalSec = Math.floor(ms / 1000);
		const d = Math.floor(totalSec / 86400);
		const h = Math.floor((totalSec % 86400) / 3600);
		const m = Math.floor((totalSec % 3600) / 60);
		const s = totalSec % 60;
		if (d > 0) return `${d}d ${h}h ${m}m`;
		if (h > 0) return `${h}h ${m}m ${s}s`;
		if (m > 0) return `${m}m ${s}s`;
		return `${s}s`;
	}

	const uptimeDisplay = $derived.by(() => {
		if ($health === null && $mcpUptime === null) return '—';
		if (uptimeMs !== null) return formatDuration(uptimeMs);
		if ($mcpUptime?.uptime) return $mcpUptime.uptime;
		if (typeof $health?.uptime === 'string' && $health.uptime.trim()) return $health.uptime;
		if ($health?.progress !== undefined || $health?.initialization_progress !== undefined) {
			return `${Math.round(($health.progress ?? $health.initialization_progress ?? 0) * 100)}%`;
		}
		return '—';
	});

	const isLiveUptime = $derived(mcpUptimeMs !== null || healthUptimeMs !== null);
	const isMcpUptime = $derived(mcpUptimeMs !== null);

	function statusVariant(status: string) {
		switch (status) {
			case 'running':
			case 'connected':
				return 'success';
			case 'failed':
			case 'error':
				return 'error';
			case 'disabled':
			case 'disconnected':
				return 'neutral';
			default:
				return 'warning';
		}
	}

	async function refreshResources() {
		if (refreshingResources) return;
		refreshingResources = true;
		try { await mcpPoller.refreshResources(); } finally { refreshingResources = false; }
	}
</script>

<PageHeader title="Overview" subtitle="System status and health at a glance" />

{#if $health === null && $mcpUptime === null}
	{#if $connectionStatus === 'disconnected'}
		<div class="flex flex-col items-center justify-center py-16 gap-3">
			<Activity class="h-8 w-8 text-muted-foreground opacity-50" aria-hidden="true" />
			<p class="text-sm text-muted-foreground">Unable to load overview — server unreachable</p>
			<button class="text-sm text-primary hover:underline" onclick={() => mcpPoller.start()}>Retry</button>
		</div>
	{:else}
		<div class="flex items-center justify-center py-20" role="status" aria-label="Loading overview">
			<Spinner size="lg" />
		</div>
	{/if}
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
		<StatCard
			label="Server Status"
			value={healthStatus}
			trend={healthStatus === 'Ready' ? { direction: 'up', value: 'Healthy' } : undefined}
		/>
		<StatCard label="Running Services" value="{runningServices} / {$services.length}" />
		<StatCard label="Infra Connected" value="{connectedInfra} / {$infra.length}" />
		<StatCard label="Uptime" value={uptimeDisplay}>
			{#if isLiveUptime}
				<p class="text-[10px] font-mono mt-1 {isMcpUptime ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}">
					● {isMcpUptime ? 'live from MCP • stackyrd_uptime' : 'live'} • updates every second
				</p>
			{/if}
		</StatCard>
	</div>

	<MemoryViz data={$memory} />

	<Card class="mt-5">
		<CardHeader class="pb-3">
			<div class="flex items-center gap-2">
				<Cpu class="h-5 w-5 text-emerald-500" aria-hidden="true" />
				<CardTitle class="text-sm font-semibold">System Resources</CardTitle>
				<span class="text-[11px] font-semibold tracking-wide text-muted-foreground">via stackyrd_resources • TUI mirror</span>
				<Button variant="outline" size="sm" class="ml-auto rounded-full h-7 px-2.5 border-black" onclick={refreshResources} disabled={refreshingResources} aria-label="Refresh system resources">
					<RefreshCw class="h-3.5 w-3.5 {refreshingResources ? 'animate-spin' : ''}" />
					{refreshingResources ? 'Refreshing' : 'Refresh'}
				</Button>
			</div>
		</CardHeader>
		<CardContent>
			{#if $resources === null}
				<div class="flex items-center gap-2 py-6 text-sm font-semibold text-muted-foreground">
					<Spinner size="sm" />
					<span>Loading resources…</span>
				</div>
			{:else}
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
					<div class="rounded-2xl border-2 border-black p-4 bg-card">
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Cpu class="h-3.5 w-3.5" /> CPU</div>
						<div class="mt-1 text-xl font-semibold tracking-tight"> {($resources.cpu_percent ?? 0).toFixed(1)}%</div>
						<div class="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden"><div class="h-full bg-p5-green" style="width: {Math.min(100, $resources.cpu_percent ?? 0)}%"></div></div>
						<div class="mt-1 text-[11px] font-semibold text-muted-foreground">{$resources.cores} cores • {$resources.cpu_model ? $resources.cpu_model.slice(0, 24) : '—'}</div>
					</div>
					<div class="rounded-2xl border-2 border-black p-4 bg-card">
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><MemoryStick class="h-3.5 w-3.5" /> Memory</div>
						<div class="mt-1 text-xl font-semibold tracking-tight">{($resources.mem_percent ?? 0).toFixed(1)}%</div>
						<div class="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden"><div class="h-full bg-p5-blue" style="width: {Math.min(100, $resources.mem_percent ?? 0)}%"></div></div>
						<div class="mt-1 text-[11px] font-semibold text-muted-foreground">{$resources.mem_used_mib} / {$resources.mem_total_mib} MiB</div>
					</div>
					<div class="rounded-2xl border-2 border-black p-4 bg-card">
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Boxes class="h-3.5 w-3.5" /> Goroutines</div>
						<div class="mt-1 text-xl font-semibold tracking-tight">{$resources.goroutines}</div>
						<div class="mt-1 text-[11px] font-semibold text-muted-foreground">App mem {$resources.app_mem_mib} MiB</div>
					</div>
					<div class="rounded-2xl border-2 border-black p-4 bg-card">
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Monitor class="h-3.5 w-3.5" /> Host</div>
						<div class="mt-1 text-sm font-semibold tracking-tight truncate">{$resources.hostname || '—'}</div>
						<div class="mt-1 text-[11px] font-semibold text-muted-foreground truncate">PID {$resources.pid}</div>
					</div>
					<div class="rounded-2xl border-2 border-black p-4 bg-card">
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Hash class="h-3.5 w-3.5" /> PID</div>
						<div class="mt-1 text-xl font-semibold tracking-tight">{$resources.pid}</div>
						<div class="mt-1 text-[11px] font-semibold text-muted-foreground">cores {$resources.cores}</div>
					</div>
					<div class="rounded-2xl border-2 border-black p-4 bg-card">
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><HardDrive class="h-3.5 w-3.5" /> System</div>
						<div class="mt-1 text-xs font-semibold truncate">{$resources.cpu_model || '—'}</div>
						<div class="mt-1 text-[11px] font-semibold text-muted-foreground">{$resources.mem_total_mib} MiB total</div>
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>

	<Card class="mt-5">
		<CardHeader class="pb-3">
			<div class="flex items-center gap-2">
				<Fingerprint class="h-5 w-5 text-violet-500" aria-hidden="true" />
				<CardTitle class="text-sm font-semibold">Instance Identity</CardTitle>
				{#if $mcpInstanceId}
					<Badge variant="outline" class="ml-auto font-semibold border-black">{ $mcpInstanceId.slice(0, 12) }</Badge>
				{/if}
				<span class="text-[11px] font-semibold tracking-wide text-muted-foreground { $mcpInstanceId ? '' : 'ml-auto'}">via stackyrd_identity • X-MCP-Instance-ID</span>
			</div>
		</CardHeader>
		<CardContent>
			{#if $instanceIdentity === null}
				<div class="flex items-center gap-2 py-6 text-sm font-semibold text-muted-foreground">
					<Spinner size="sm" />
					<span>Loading identity…</span>
				</div>
			{:else}
				<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
					<div class="rounded-2xl border-2 border-black p-4 bg-card">
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Fingerprint class="h-3.5 w-3.5" /> Instance ID</div>
						<div class="mt-1 text-xs font-semibold tracking-tight break-all">{$instanceIdentity.instance_id}</div>
						<div class="mt-1 text-[11px] font-semibold text-muted-foreground">PID {$instanceIdentity.pid}</div>
					</div>
					<div class="rounded-2xl border-2 border-black p-4 bg-card">
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Server class="h-3.5 w-3.5" /> Pod</div>
						<div class="mt-1 text-sm font-semibold tracking-tight truncate">{$instanceIdentity.pod_name || '—'}</div>
						<div class="mt-1 text-[11px] font-semibold text-muted-foreground truncate">{$instanceIdentity.pod_ip || 'no IP'}</div>
					</div>
					<div class="rounded-2xl border-2 border-black p-4 bg-card">
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Building2 class="h-3.5 w-3.5" /> Namespace</div>
						<div class="mt-1 text-sm font-semibold tracking-tight truncate">{$instanceIdentity.namespace || 'default'}</div>
						<div class="mt-1 text-[11px] font-semibold text-muted-foreground truncate">Node {$instanceIdentity.node_name || '—'}</div>
					</div>
					<div class="rounded-2xl border-2 border-black p-4 bg-card">
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Globe class="h-3.5 w-3.5" /> Hostname</div>
						<div class="mt-1 text-sm font-semibold tracking-tight truncate">{$instanceIdentity.hostname}</div>
						<div class="mt-1 text-[11px] font-semibold text-muted-foreground">PID {$instanceIdentity.pid}</div>
					</div>
					<div class="rounded-2xl border-2 border-black p-4 bg-card md:col-span-2 lg:col-span-2">
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Hash class="h-3.5 w-3.5" /> Started</div>
						<div class="mt-1 text-xs font-semibold tracking-tight">{$instanceIdentity.started_at ? new Date($instanceIdentity.started_at).toLocaleString() : '—'}</div>
						<div class="mt-1 text-[11px] font-semibold text-muted-foreground truncate">instance header: {$mcpInstanceId ?? '—'}</div>
					</div>
					<div class="rounded-2xl border-2 border-black p-4 bg-card md:col-span-2 lg:col-span-2">
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Monitor class="h-3.5 w-3.5" /> Cluster</div>
						<div class="mt-1 text-sm font-semibold tracking-tight">{$mcpInstanceId ? '1 member' : '—'}</div>
						<div class="mt-1 text-[11px] font-semibold text-muted-foreground">via stackyrd_cluster</div>
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
		<Card class="flex flex-col">
			<CardHeader class="pb-3">
				<div class="flex items-center gap-2">
					<Server class="h-5 w-5 text-primary" aria-hidden="true" />
					<CardTitle class="text-sm">Services</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				{#if $services.length === 0}
					<EmptyState message="No services discovered" description="Services will appear here once registered" icon={Server} />
				{:else}
					<div class="space-y-0 divide-y divide-border">
						{#each $services as service}
							<div class="flex items-center justify-between py-4 px-1">
								<div class="flex flex-col gap-1.5 min-w-0">
									<span class="text-sm font-medium leading-none truncate">{service.name}</span>
									<span class="text-xs text-muted-foreground font-mono truncate">{service.wire_name}</span>
								</div>
								<Badge variant={statusVariant(service.status)} class="ml-4 shrink-0">{service.status}</Badge>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<Card class="flex flex-col">
			<CardHeader class="pb-4">
				<div class="flex items-center gap-2">
					<HardDrive class="h-5 w-5 text-violet-500" aria-hidden="true" />
					<CardTitle class="text-sm">Infrastructure</CardTitle>
				</div>
			</CardHeader>
			<CardContent class="px-7">
				{#if $infra.length === 0}
					<EmptyState message="No infrastructure components" description="Infrastructure status will appear once connected" icon={HardDrive} />
				{:else}
					<div class="space-y-0 divide-y divide-border">
						{#each $infra as component}
							<div class="flex items-center justify-between py-4 px-1">
								<div class="flex flex-col gap-1.5 min-w-0">
									<span class="text-sm font-medium leading-none truncate">{component.name}</span>
									<span class="text-xs text-muted-foreground truncate">{component.type}</span>
								</div>
								<Badge variant={statusVariant(component.status)} class="ml-4 shrink-0">{component.status}</Badge>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>

	{#if failedServices > 0}
		<Alert variant="destructive" class="mt-4 bg-destructive/10 border-destructive/20">
			<AlertTriangle class="h-4 w-4" />
			<AlertTitle>Service failure detected</AlertTitle>
			<AlertDescription>
				{failedServices} service{failedServices > 1 ? 's' : ''} in failed state. Check the services page for details.
			</AlertDescription>
		</Alert>
	{/if}
{/if}
