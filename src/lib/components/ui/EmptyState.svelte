<script lang="ts">
	import { cn } from "$lib/utils.js";
	import Button from "$lib/components/ui/Button.svelte";
	import { Asterisk } from 'lucide-svelte';

	let {
		title,
		message = 'No data available',
		description,
		icon: Icon,
		action,
		class: className = ''
	} = $props<{
		title?: string;
		message?: string;
		description?: string;
		icon?: unknown;
		action?: { label: string; onclick: () => void };
		class?: string;
	}>();

	const displayTitle = $derived(title ?? message);
	const displayDescription = $derived(description ?? (title ? message : undefined));
	const IconComp = $derived((Icon as typeof Asterisk) ?? Asterisk);
</script>

<div class={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
	<div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-p5-yellow border-2 border-black">
		<IconComp class="h-6 w-6 text-black" aria-hidden="true" />
	</div>
	<h3 class="text-base font-bold tracking-tight" style="font-family: var(--font-display);">{displayTitle}</h3>
	{#if displayDescription}
		<p class="mt-1 max-w-sm text-sm font-mono text-muted-foreground leading-relaxed">{displayDescription}</p>
	{:else if !Icon}
		<p class="mt-1 max-w-sm text-sm font-mono text-muted-foreground">{message}</p>
	{/if}
	{#if action}
		<Button variant="outline" size="sm" class="mt-5 rounded-full border-black" onclick={action.onclick}>
			{action.label}
		</Button>
	{/if}
</div>
