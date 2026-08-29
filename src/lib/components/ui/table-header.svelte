<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let { class: className, children, ...rest }: { class?: string; children?: Snippet } = $props();
</script>

<thead class={cn("[&_tr]:border-b", className)} {...rest}>
	{@render children?.()}
</thead>
