<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from 'svelte';

	let { label, value, trend, children, class: className = '' } = $props<{
		label: string;
		value: string | number;
		trend?: { direction: 'up' | 'down' | 'flat'; value: string };
		children?: Snippet;
		class?: string;
	}>();

	const accent = $derived(
		label.toLowerCase().includes('server') ? 'bg-p5-yellow' :
		label.toLowerCase().includes('running') ? 'bg-p5-magenta' :
		label.toLowerCase().includes('infra') ? 'bg-p5-green' :
		label.toLowerCase().includes('uptime') ? 'bg-p5-blue' : 'bg-p5-yellow'
	);
</script>

<div class={cn("rounded-2xl border-2 border-black bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden hover:shadow-md transition-shadow", className)}>
	<span class={cn("absolute top-0 left-0 h-1.5 w-full", accent)} aria-hidden="true"></span>
	<p class="text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">{label}</p>
	<div class="flex items-end justify-between gap-2">
		<p class="text-2xl md:text-3xl font-bold tracking-tight leading-none" style="font-family: var(--font-display);">{value}</p>
		{#if trend}
			<span
				class={cn(
					"text-xs font-bold px-2 py-1 rounded-full border-2 border-black",
					trend.direction === 'up' ? 'bg-p5-yellow text-black' : trend.direction === 'down' ? 'bg-black text-white' : 'bg-muted text-foreground'
				)}
			>
				{trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
			</span>
		{/if}
	</div>
	{#if children}
		<div class="mt-3">
			{@render children()}
		</div>
	{/if}
</div>
