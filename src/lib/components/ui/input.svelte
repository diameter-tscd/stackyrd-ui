<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { HTMLInputAttributes } from "svelte/elements";

	let {
		class: className,
		value = $bindable(),
		type = "text",
		...rest
	}: HTMLInputAttributes & { value?: string } = $props();
</script>

<input
	type={type}
	class={cn(
		"flex h-11 w-full rounded-full border-2 border-black bg-white px-6 py-3 text-sm font-medium shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground placeholder:font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-black dark:text-white",
		className
	)}
	bind:value
	{...rest}
/>
