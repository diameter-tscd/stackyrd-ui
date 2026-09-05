<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { BookOpen, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-svelte';

	let loading = $state(true);
	let failed = $state(false);
	let swaggerUrl = $state('/swagger/index.html');
	let frameKey = $state(0);
	let iframeEl = $state<HTMLIFrameElement | null>(null);

	onMount(() => {
		const controller = new AbortController();
		fetch('/swagger/doc.json', { signal: controller.signal })
			.then((r) => {
				if (!r.ok) failed = true;
			})
			.catch(() => {
				failed = false;
			});
		return () => controller.abort();
	});

	function reload() {
		loading = true;
		failed = false;
		frameKey += 1;
	}

	function openExternal() {
		window.open(swaggerUrl, '_blank', 'noopener');
	}
</script>

<svelte:head>
	<title>Swagger - Stackyrd</title>
	<meta name="description" content="Swagger - Stackyrd" />
</svelte:head>

<PageHeader title="Swagger" subtitle="Interactive API documentation — proxied from :8080/swagger">
	<div class="flex gap-2">
		<Button variant="outline" size="sm" onclick={reload} aria-label="Reload swagger">
			<RefreshCw class="h-4 w-4" />
			Reload
		</Button>
		<Button variant="default" size="sm" onclick={openExternal} aria-label="Open swagger in new tab">
			<ExternalLink class="h-4 w-4" />
			Open external
		</Button>
	</div>
</PageHeader>

<Card class="p-0 overflow-hidden border-2 border-black bg-white dark:bg-black">
	{#if failed}
		<div class="p-8">
			<EmptyState
				icon={AlertTriangle}
				title="Swagger unavailable"
				message="Could not reach :8080/swagger"
				description="Ensure backend is running with swagger.enabled=true (config.yaml) and Vite proxy /swagger → :8080 is reachable. Try Reload or open externally."
			/>
			<div class="flex justify-center gap-2 mt-6">
				<Button variant="outline" size="sm" onclick={reload}>
					<RefreshCw class="h-4 w-4" /> Retry
				</Button>
				<Button variant="default" size="sm" onclick={openExternal}>
					<ExternalLink class="h-4 w-4" /> Open /swagger
				</Button>
			</div>
		</div>
	{:else}
		<div class="relative bg-white">
			{#if loading}
				<div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white dark:bg-black z-10">
					<Spinner size="lg" />
					<p class="text-xs font-mono text-muted-foreground">Loading Swagger UI…</p>
				</div>
			{/if}
			{#key frameKey}
				<iframe
					bind:this={iframeEl}
					title="Swagger UI"
					src={swaggerUrl}
					class="w-full h-[calc(100vh-14rem)] min-h-[620px] border-0 bg-white"
					loading="lazy"
					referrerpolicy="same-origin"
					allow="fullscreen"
					onload={() => (loading = false)}
					onerror={() => {
						loading = false;
						failed = true;
					}}
				></iframe>
			{/key}
		</div>
	{/if}
</Card>

<p class="mt-3 text-xs font-mono text-muted-foreground flex items-center gap-1.5">
	<BookOpen class="h-3.5 w-3.5" aria-hidden="true" />
	Vite proxies <code class="bg-muted px-1.5 py-0.5 rounded-full border border-black text-[11px]">/swagger</code> → <code class="bg-muted px-1.5 py-0.5 rounded-full border border-black text-[11px]">:8080</code> • Route <code class="bg-muted px-1.5 py-0.5 rounded-full border border-black text-[11px]">/swagger/index.html</code> • spec <code class="bg-muted px-1.5 py-0.5 rounded-full border border-black text-[11px]">/swagger/doc.json</code>
</p>
