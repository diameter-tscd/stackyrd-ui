<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { size = 'md', class: className = '' }: { size?: 'sm' | 'md' | 'lg'; class?: string } = $props();

	const sizes: Record<string, string> = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
</script>

<div class={cn("flex items-center justify-center", className)} role="status" aria-label="Loading">
	<div
		class={cn("border-2 border-muted border-t-primary rounded-full animate-spin", sizes[size])}
	></div>
</div>
