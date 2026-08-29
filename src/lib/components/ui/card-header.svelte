<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let { class: className, children, ...rest }: { class?: string; children?: Snippet } = $props();
</script>

<div class={cn("flex flex-col space-y-1.5 p-6", className)} {...rest}>
	{@render children?.()}
</div>
