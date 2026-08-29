<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let { class: className, children, ...rest }: { class?: string; children?: Snippet } = $props();
</script>

<div class={cn("text-sm [&_p]:leading-relaxed", className)} {...rest}>
	{@render children?.()}
</div>
