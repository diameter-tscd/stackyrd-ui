<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, theme, toasts } from '$lib/stores/auth';
	import { getConfig } from '$lib/api/endpoints';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardTitle from '$lib/components/ui/card-title.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import CardDescription from '$lib/components/ui/card-description.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Separator from '$lib/components/ui/separator.svelte';
	import { Settings, Palette } from 'lucide-svelte';
	import type { ConfigData } from '$lib/types/api';

	let loading = $state(true);
	let config = $state<ConfigData | null>(null);

	onMount(async () => {
		try {
			const res = await getConfig($auth.token);
			if (res.data) config = res.data;
		} catch {
			toasts.add('error', 'Failed to load config');
		} finally {
			loading = false;
		}
	});

	const themes: Array<{ id: import('$lib/stores/auth').ThemeName; label: string }> = [
		{ id: 'light', label: 'Light' },
		{ id: 'dark', label: 'Dark' },
		{ id: 'night', label: 'Night' }
	];
</script>

<PageHeader title="Configuration" subtitle="View current stackyrd configuration" />

{#if loading}
	<div class="flex items-center justify-center py-20" role="status" aria-label="Loading configuration">
		<Spinner size="lg" />
	</div>
{:else if !config}
	<EmptyState title="No config" message="Configuration not available" icon={Settings} description="Config will appear once the server is reachable" />
{:else}
	<div class="space-y-4">
		<Card>
			<CardHeader>
				<div class="flex items-center gap-2">
					<Palette class="h-5 w-5 text-violet-500" aria-hidden="true" />
					<CardTitle class="text-sm">Dashboard Theme</CardTitle>
				</div>
				<CardDescription>Select the visual theme for the dashboard</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="flex flex-wrap gap-2" role="group" aria-label="Theme selection">
					{#each themes as t}
						<Button
							variant={$theme === t.id ? "default" : "outline"}
							size="sm"
							onclick={() => theme.set(t.id)}
							aria-pressed={$theme === t.id}
						>
							{t.label}
						</Button>
					{/each}
				</div>
			</CardContent>
		</Card>

		{#if config.services}
			<Card>
				<CardHeader>
					<CardTitle class="text-sm">Services</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
						{#each Object.entries(config.services) as [name, enabled]}
							<div class="flex items-center justify-between py-2.5 px-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
								<span class="text-sm font-medium truncate">{name}</span>
								<Badge variant={enabled ? 'success' : 'neutral'} class="ml-2 shrink-0">{enabled ? 'Enabled' : 'Disabled'}</Badge>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		{/if}

		{#if config.middleware}
			<Card>
				<CardHeader>
					<CardTitle class="text-sm">Middleware</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
						{#each Object.entries(config.middleware) as [name, enabled]}
							<div class="flex items-center justify-between py-2.5 px-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
								<span class="text-sm font-medium truncate">{name}</span>
								<Badge variant={enabled ? 'success' : 'neutral'} class="ml-2 shrink-0">{enabled ? 'Enabled' : 'Disabled'}</Badge>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		{/if}
	</div>
{/if}
