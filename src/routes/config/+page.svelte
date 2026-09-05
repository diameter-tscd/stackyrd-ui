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
	import { FileText, Copy, Download, RefreshCw, Code2, Pencil, Save, X, RotateCcw, Check, Search } from 'lucide-svelte';

	let loading = $state(true);
	let raw = $state('');
	let parsed: unknown = $state(null);
	let source = $state('');
	let error = $state('');
	let tab = $state<'raw' | 'parsed'>('raw');
	let editing = $state(false);
	let draft = $state('');
	let findQuery = $state('');
	let textareaEl: HTMLTextAreaElement | undefined = $state(undefined);

	const hasParsed = $derived(parsed !== null && parsed !== undefined);
	const lineCount = $derived(draft.split('\n').length);
	const charCount = $derived(draft.length);
	const dirty = $derived(editing && draft !== raw);
	const lines = $derived(draft.split('\n'));
	const filteredLineNumbers = $derived(findQuery ? lines.map((l,i) => ({i,l,match: l.toLowerCase().includes(findQuery.toLowerCase())})).filter(x=>x.match).length : -1);

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
		const text = editing ? draft : raw;
		navigator.clipboard.writeText(text).then(() => toasts.add('success', 'Copied config.yaml'));
	}

	function downloadRaw() {
		const text = editing ? draft : raw;
		const blob = new Blob([text], { type: 'text/yaml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'config.yaml';
		a.click();
		URL.revokeObjectURL(url);
	}

	function startEdit() {
		draft = raw;
		editing = true;
		tab = 'raw';
		queueMicrotask(() => textareaEl?.focus());
	}

	function cancelEdit() {
		editing = false;
		draft = raw;
		findQuery = '';
	}

	function applyEdit() {
		raw = draft;
		editing = false;
		toasts.add('success', 'Local edits applied — copy or download to persist');
	}

	function resetDraft() {
		draft = raw;
		toasts.add('success', 'Restored original');
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Tab') {
			e.preventDefault();
			const el = e.target as HTMLTextAreaElement;
			const start = el.selectionStart;
			const end = el.selectionEnd;
			draft = draft.slice(0, start) + '  ' + draft.slice(end);
			queueMicrotask(() => {
				el.selectionStart = el.selectionEnd = start + 2;
			});
		}
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			if (dirty) applyEdit();
		}
		if (e.key === 'Escape' && editing) cancelEdit();
	}

	function jumpToFirstMatch() {
		if (!findQuery || !textareaEl) return;
		const idx = draft.toLowerCase().indexOf(findQuery.toLowerCase());
		if (idx >= 0) {
			textareaEl.focus();
			textareaEl.setSelectionRange(idx, idx + findQuery.length);
		}
	}
</script>

<svelte:head>
	<title>Configuration - Stackyrd</title>
	<meta name="description" content="Configuration - Stackyrd" />
</svelte:head>

<PageHeader title="Configuration" subtitle="config.yaml — via stackyrd_config (afero embed) with REST fallback">
	<div class="flex gap-2 flex-wrap">
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
			{#if !editing}
				<Button size="sm" onclick={startEdit} aria-label="Edit YAML">
					<Pencil class="h-4 w-4" /> Edit
				</Button>
			{:else}
				<Button size="sm" onclick={applyEdit} disabled={!dirty} aria-label="Apply edits">
					<Save class="h-4 w-4" /> Apply
				</Button>
				<Button variant="outline" size="sm" onclick={cancelEdit} aria-label="Cancel edit">
					<X class="h-4 w-4" /> Cancel
				</Button>
			{/if}
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
	<Card class="overflow-hidden">
		<div class="h-1.5 w-full bg-p5-yellow"></div>
		<CardHeader class="pb-3">
			<div class="flex flex-wrap items-center gap-2">
				<div class="flex items-center gap-2">
					<div class="flex items-center gap-1.5 rounded-full border-2 border-black px-2.5 py-1 bg-white">
						<span class="h-2.5 w-2.5 rounded-full bg-red-500 border border-black"></span>
						<span class="h-2.5 w-2.5 rounded-full bg-p5-yellow border border-black"></span>
						<span class="h-2.5 w-2.5 rounded-full bg-p5-green border border-black"></span>
					</div>
					<CardTitle class="text-sm">config.yaml</CardTitle>
				</div>
				{#if source}
					<Badge variant="outline" class="font-mono text-[11px] border-black">{source}</Badge>
				{/if}
				{#if editing}
					<Badge class="bg-p5-yellow text-black border-black gap-1">
						<span class="h-1.5 w-1.5 rounded-full bg-black animate-pulse"></span> editing
					</Badge>
					{#if dirty}
						<Badge variant="outline" class="border-amber-500 text-amber-700 bg-amber-50 gap-1">
							<Check class="h-3 w-3" /> unsaved
						</Badge>
					{/if}
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
			<CardDescription class="flex flex-wrap items-center gap-2">
				<Code2 class="h-3.5 w-3.5" /> {hasParsed ? 'stackyrd://config • 5s cache • yaml.v3 parsed' : 'raw view only'} • {(editing ? draft.length : raw.length).toLocaleString()} bytes
				{#if editing}
					<span class="inline-flex items-center gap-1.5 ml-1">• {lineCount} lines • {charCount.toLocaleString()} chars • Tab: 2 spaces • ⌘S to apply • Esc to cancel</span>
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent class="pt-0">
			{#if tab === 'raw'}
				{#if editing}
					<div class="rounded-xl border-2 border-black overflow-hidden bg-white dark:bg-zinc-900 flex flex-col shadow-sm">
						<div class="flex items-center gap-2 px-3 py-2 border-b-2 border-black bg-muted/30 flex-wrap">
							<div class="flex items-center gap-2 text-[11px] font-mono font-semibold">
								<span class="px-2 py-0.5 rounded-full bg-black text-white">{lineCount} lines</span>
								<span class="px-2 py-0.5 rounded-full border border-black bg-white dark:bg-zinc-800">{charCount.toLocaleString()} chars</span>
								{#if dirty}<span class="text-amber-600">• modified</span>{/if}
							</div>
							<div class="ml-auto flex items-center gap-1.5">
								<button onclick={resetDraft} disabled={!dirty} class="inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-muted/50">
									<RotateCcw class="h-3 w-3" /> Reset
								</button>
								<button onclick={applyEdit} disabled={!dirty} class="inline-flex items-center gap-1 rounded-full bg-black text-white px-3 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-zinc-800">
									<Save class="h-3 w-3" /> Apply
								</button>
							</div>
						</div>
						<div class="flex items-center gap-2 px-3 py-2 border-b border-black/10 bg-white dark:bg-zinc-900">
							<div class="relative flex-1 max-w-[320px]">
								<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
								<input
									bind:value={findQuery}
									placeholder="Find in file…"
									class="w-full rounded-full border-2 border-black bg-muted/20 pl-8 pr-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-p5-yellow"
									onkeydown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); jumpToFirstMatch(); } }}
								/>
							</div>
							{#if findQuery}
								<span class="text-xs font-semibold">
									{#if filteredLineNumbers >=0}{filteredLineNumbers} match{filteredLineNumbers===1?'':'es'}{/if}
								</span>
								<button onclick={jumpToFirstMatch} class="text-xs font-semibold underline decoration-2 underline-offset-2">Jump</button>
								<button onclick={()=>findQuery=''} class="rounded-full border border-black px-2 py-0.5 text-xs font-semibold">Clear</button>
							{/if}
						</div>
						<div class="flex min-h-[480px] max-h-[70vh] overflow-hidden">
							<div class="hidden sm:block select-none overflow-hidden bg-muted/40 border-r-2 border-black text-right py-4 pr-3 pl-3 font-mono text-[11px] leading-[1.7] text-muted-foreground" aria-hidden="true">
								{#each lines as _, i}
									<div class="tabular-nums {findQuery && lines[i].toLowerCase().includes(findQuery.toLowerCase()) ? 'bg-p5-yellow text-black px-1 rounded' : ''}">{i + 1}</div>
								{/each}
							</div>
							<textarea
								bind:this={textareaEl}
								bind:value={draft}
								onkeydown={onKeydown}
								spellcheck={false}
								autocomplete="off"
								class="flex-1 w-full bg-transparent p-4 font-mono text-xs leading-[1.7] text-foreground placeholder:text-muted-foreground focus:outline-none resize-none overflow-auto"
								placeholder="config.yaml content…"
								aria-label="Edit config.yaml"
								style="tab-size: 2;"
							></textarea>
						</div>
						<div class="flex items-center justify-between px-3 py-2 border-t-2 border-black bg-p5-yellow/20 text-[11px] font-mono font-semibold">
							<span>flowbite code edit • YAML • UTF-8 • LF</span>
							<span class="hidden sm:inline">Tip: editing is local — use Copy/Download to persist</span>
						</div>
					</div>
				{:else}
					<pre class="overflow-auto rounded-xl border-2 border-black bg-muted/30 p-4 text-xs font-mono leading-relaxed text-foreground max-h-[70vh]"><code>{raw}</code></pre>
				{/if}
			{:else}
				<pre class="overflow-auto rounded-xl border-2 border-black bg-black text-white p-4 text-xs font-mono leading-relaxed max-h-[70vh]">{JSON.stringify(parsed, null, 2)}</pre>
			{/if}
			{#if error}
				<p class="mt-3 text-xs font-semibold text-amber-600">Fallback warning: {error}</p>
			{/if}
			{#if editing}
				<p class="mt-2 text-xs font-semibold text-muted-foreground">Edits are in-memory only (afero embed is read-only). Apply then Copy or Download to save locally.</p>
			{/if}
		</CardContent>
	</Card>
{/if}
