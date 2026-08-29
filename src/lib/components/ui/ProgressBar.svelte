<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { value = 0, max = 100, color = 'sky', class: className = '' } = $props<{
		value: number;
		max?: number;
		color?: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
		class?: string;
	}>();

	const colors: Record<string, string> = {
		sky: 'bg-primary',
		emerald: 'bg-emerald-500',
		amber: 'bg-amber-500',
		rose: 'bg-destructive',
		violet: 'bg-violet-500'
	};

	const pct = $derived(Math.min((value / max) * 100, 100));
</script>

<div class={cn("w-full bg-secondary rounded-full h-2 overflow-hidden", className)}>
	<div
		class={cn("h-full rounded-full transition-all duration-300", colors[color])}
		style="width: {pct}%"
		role="progressbar"
		aria-valuenow={value}
		aria-valuemin={0}
		aria-valuemax={max}
	></div>
</div>
