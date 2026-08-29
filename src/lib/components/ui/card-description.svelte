<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let { class: className, children, ...rest }: { class?: string; children?: Snippet } = $props();
</script>

<p class={cn("text-sm text-muted-foreground", className)} {...rest}>
	{@render children?.()}
</p>
