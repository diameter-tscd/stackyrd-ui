<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { animate } from "motion";

	let {
		title,
		subtitle,
		class: className = '',
		children
	} = $props<{
		title: string;
		subtitle?: string;
		class?: string;
		children?: import('svelte').Snippet;
	}>();

	function headerIn(node: HTMLElement) {
		const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (prefersReduced) return;
 // -ignore
		(animate as any)(node as any, { y: [-8, 0], opacity: [0, 1] }, { duration: 0.35, easing: "ease-out" });
	}
</script>

<div {@attach headerIn} class={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
	<div class="space-y-2">
		<h1 class="text-3xl md:text-4xl font-bold tracking-tight leading-none" style="font-family: var(--font-display);">
			{title}
			<span class="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle"></span>
		</h1>
		{#if subtitle}
			<p class="text-sm font-semibold font-mono text-muted-foreground max-w-prose leading-relaxed border-l-2 border-black pl-3">
				{subtitle}
			</p>
		{/if}
	</div>
	{#if children}
		<div class="flex items-center gap-2 shrink-0">
			{@render children()}
		</div>
	{/if}
</div>
