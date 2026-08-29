<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let { class: className, children, ...rest }: { class?: string; children?: Snippet } = $props();
</script>

<h5 class={cn("mb-1 font-medium leading-none tracking-tight", className)} {...rest}>
	{@render children?.()}
</h5>
