<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let { class: className, children, ...rest }: { class?: string; children?: Snippet } = $props();
</script>

<div class={cn("flex items-center p-6 pt-0", className)} {...rest}>
	{@render children?.()}
</div>
