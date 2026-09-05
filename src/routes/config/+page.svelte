<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, toasts } from '$lib/stores/auth';
	import { getMCPConfig, getConfigYaml } from '$lib/api/endpoints';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardTitle from '$lib/components/ui/card-title.svelte';
	import CardDescription from '$lib/components/ui/card-description.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { FileText, Copy, Download, RefreshCw, Code2 } from 'lucide-svelte';

	let loading = $state(true);
	let raw = $state('');
	let parsed: unknown = $state(null);
	let source = $state('');
	let error = $state('');
	let tab = $state<'raw' | 'parsed'>('raw');

	async function load() {
		loading = true;
		error = '';
		try {
			const res = await getMCPConfig($auth.token);
			if (res?.data) {
				const d = res.data as any;
				if (d.error) throw new Error(d.error);
				raw = d.raw ?? '';
				parsed = d.parsed ?? null;
				source = d.source ?? 'afero:config.yaml';
				if (!raw && !parsed) throw new Error('Empty config from MCP');
				loading = false;
				return;
			}
			throw new Error('No data from stackyrd_config');
		} catch (e) {
			try {
				raw = await getConfigYaml($auth.token);
				parsed = null;
				source = 'rest:/api/v1/config/raw (fallback)';
				error = '';
			} catch (e2) {
				error = (e as Error)?.message || (e2 as Error)?.message || 'Failed to load config';
				toasts.add('error', error);
			}
		} finally {
			loading = false;
		}
	}

	onMount(load);

	function copyRaw() {
		navigator.clipboard.writeText(raw).then(() => toasts.add('success', 'Copied config.yaml'));
	}

	function downloadRaw() {
		const blob = new Blob([raw], { type: 'text/yaml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'config.yaml';
		a.click();
		URL.revokeObjectURL(url);
	}

	const hasParsed = $derived(parsed !== null && parsed !== undefined);
</script>

<PageHeader title="Configuration" subtitle="config.yaml — via stackyrd_config (afero embed) with REST fallback">
	<div class="flex gap-2">
		<Button variant="outline" size="sm" onclick={load} aria-label="Reload config">
			<RefreshCw class="h-4 w-4" /> Reload
		</Button>
		{#if raw}
			<Button variant="outline" size="sm" onclick={copyRaw} aria-label="Copy YAML">
				<Copy class="h-4 w-4" /> Copy
			</Button>
			<Button variant="outline" size="sm" onclick={downloadRaw} aria-label="Download YAML">
				<Download class="h-4 w-4" /> Download
			</Button>
		{/if}
	</div>
</PageHeader>

{#if loading}
	<div class="flex items-center justify-center py-20" role="status" aria-label="Loading configuration">
		<Spinner size="lg" />
	</div>
{:else if error && !raw}
	<EmptyState title="Error" message={error} icon={FileText} description="Ensure the server is reachable and try again" />
{:else}
	<Card>
		<CardHeader>
			<div class="flex flex-wrap items-center gap-2">
				<CardTitle class="text-sm">config.yaml</CardTitle>
				{#if source}
					<Badge variant="outline" class="font-mono text-[11px] border-black">{source}</Badge>
				{/if}
				<div class="ml-auto flex gap-1 rounded-full border-2 border-black p-1 bg-muted/20">
					<button
						class="px-3 py-1 rounded-full text-xs font-semibold transition {tab === 'raw' ? 'bg-black text-white' : 'text-muted-foreground hover:text-foreground'}"
						onclick={() => tab = 'raw'}
					>Raw YAML</button>
					<button
						class="px-3 py-1 rounded-full text-xs font-semibold transition {tab === 'parsed' ? 'bg-black text-white' : 'text-muted-foreground hover:text-foreground'} disabled:opacity-40"
						disabled={!hasParsed}
						onclick={() => tab = 'parsed'}
						title={hasParsed ? 'Parsed view from afero' : 'No parsed data'}
					>Parsed JSON</button>
				</div>
			</div>
			<CardDescription class="flex items-center gap-2">
				<Code2 class="h-3.5 w-3.5" /> {hasParsed ? 'stackyrd://config • 5s cache • yaml.v3 parsed' : 'raw view only'} • {raw.length.toLocaleString()} bytes
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if tab === 'raw'}
				<pre class="overflow-auto rounded-xl border-2 border-black bg-muted/30 p-4 text-xs font-mono leading-relaxed text-foreground max-h-[70vh]"><code>{raw}</code></pre>
			{:else}
				<pre class="overflow-auto rounded-xl border-2 border-black bg-black text-white p-4 text-xs font-mono leading-relaxed max-h-[70vh]">{JSON.stringify(parsed, null, 2)}</pre>
			{/if}
			{#if error}
				<p class="mt-3 text-xs font-semibold text-amber-600">Fallback warning: {error}</p>
			{/if}
		</CardContent>
	</Card>
{/if}
