<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let { class: className, children, ...rest }: { class?: string; children?: Snippet } = $props();
</script>

<h3 class={cn("font-semibold leading-none tracking-tight", className)} {...rest}>
	{@render children?.()}
</h3>
