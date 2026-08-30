<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, toasts } from '$lib/stores/auth';
	import { getConfigYaml } from '$lib/api/endpoints';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardTitle from '$lib/components/ui/card-title.svelte';
	import CardDescription from '$lib/components/ui/card-description.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { FileText } from 'lucide-svelte';

	let loading = $state(true);
	let configYaml = $state('');
	let error = $state('');

	onMount(async () => {
		try {
			configYaml = await getConfigYaml($auth.token);
		} catch (e) {
			error = (e as Error)?.message || 'Failed to load config';
			toasts.add('error', 'Failed to load config.yaml');
		} finally {
			loading = false;
		}
	});
</script>

<PageHeader title="Configuration" subtitle="config.yaml — read-only view" />

{#if loading}
	<div class="flex items-center justify-center py-20" role="status" aria-label="Loading configuration">
		<Spinner size="lg" />
	</div>
{:else if error}
	<EmptyState title="Error" message={error} icon={FileText} description="Ensure the server is reachable and try again" />
{:else}
	<Card>
		<CardHeader>
			<CardTitle class="text-sm">config.yaml</CardTitle>
			<CardDescription>Current stackyrd configuration file</CardDescription>
		</CardHeader>
		<CardContent>
			<pre class="overflow-auto rounded-xl border-2 border-black bg-muted/30 p-4 text-xs font-mono leading-relaxed text-foreground max-h-[70vh]"><code>{configYaml}</code></pre>
		</CardContent>
	</Card>
{/if}
