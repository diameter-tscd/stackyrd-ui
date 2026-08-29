<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { health, services, infra, connectionStatus } from '$lib/stores/data';
	import { getHealth, getMCPServices, getMCPInfra } from '$lib/api/endpoints';
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
	import { Server, HardDrive, AlertTriangle, Activity } from 'lucide-svelte';

	let polling: ReturnType<typeof setInterval> | null = null;

	onMount(async () => {
		await pollData();
		polling = setInterval(pollData, 10000);
	});

	onDestroy(() => {
		if (polling) clearInterval(polling);
	});

	async function pollData() {
		const results = await Promise.allSettled([
			getHealth($auth.token),
			getMCPServices($auth.token),
			getMCPInfra($auth.token)
		]);
		const [hRes, sRes, iRes] = results;
		let hasSuccess = false;
		let hasFailure = false;
		if (hRes.status === 'fulfilled' && hRes.value?.data) {
			health.set(hRes.value.data);
			hasSuccess = true;
		} else {
			hasFailure = true;
		}
		if (sRes.status === 'fulfilled' && sRes.value?.data) {
			services.set(sRes.value.data);
			hasSuccess = true;
		} else {
			hasFailure = true;
		}
		if (iRes.status === 'fulfilled' && iRes.value?.data) {
			infra.set(iRes.value.data);
			hasSuccess = true;
		} else {
			hasFailure = true;
		}
		if (hasSuccess && !hasFailure) connectionStatus.set('connected');
		else if (hasSuccess && hasFailure) connectionStatus.set('connected');
		else connectionStatus.set('disconnected');
	}

	const runningServices = $derived($services.filter((s) => s.status === 'running').length);
	const failedServices = $derived($services.filter((s) => s.status === 'failed').length);
	const connectedInfra = $derived($infra.filter((i) => i.status === 'connected').length);
	const uptimeDisplay = $derived($health?.uptime ?? ($health?.status ? String($health.status) : '') ?? ($health?.progress !== undefined ? `${Math.round(($health.progress ?? $health.initialization_progress ?? 0) * 100)}%` : '—'));
	const healthStatus = $derived($health?.server_ready ? 'Ready' : ($health?.status === 'ready' ? 'Ready' : 'Initializing'));

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
</script>

<PageHeader title="Overview" subtitle="System status and health at a glance" />

{#if $health === null}
	{#if $connectionStatus === 'disconnected'}
		<div class="flex flex-col items-center justify-center py-16 gap-3">
			<Activity class="h-8 w-8 text-muted-foreground opacity-50" aria-hidden="true" />
			<p class="text-sm text-muted-foreground">Unable to load overview — server unreachable</p>
			<button class="text-sm text-primary hover:underline" onclick={pollData}>Retry</button>
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
		<StatCard label="Uptime" value={uptimeDisplay} />
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
