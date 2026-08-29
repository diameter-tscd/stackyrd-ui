<script lang="ts">
	import { theme, type ThemeName } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';
	import { Sun, Moon, Eclipse } from 'lucide-svelte';
	import { cn } from "$lib/utils.js";

	let {
		size = "sm",
		class: className = "",
		showLabels = false
	} = $props<{
		size?: "sm" | "default" | "icon";
		class?: string;
		showLabels?: boolean;
	}>();

	const options: Array<{ value: ThemeName; label: string; icon: typeof Sun }> = [
		{ value: 'light', label: 'Light', icon: Sun },
		{ value: 'dark', label: 'Dark', icon: Moon },
		{ value: 'night', label: 'Night', icon: Eclipse }
	];
</script>

<div
	class={cn("inline-flex items-center rounded-full border-2 border-black bg-background p-1 gap-1 shadow-sm", className)}
	role="group"
	aria-label="Theme selection"
>
	{#each options as opt}
		<Button
			variant={$theme === opt.value ? "default" : "ghost"}
			size={size === "icon" ? "icon" : "sm"}
			class={cn("h-7 gap-1.5 rounded-full border-2", $theme === opt.value ? "border-black shadow-sm" : "border-transparent")}
			onclick={() => theme.set(opt.value)}
			aria-pressed={$theme === opt.value}
			aria-label="Switch to {opt.label} theme"
			title={opt.label}
		>
			<opt.icon class="h-3.5 w-3.5" aria-hidden="true" />
			{#if showLabels}
				<span class="hidden sm:inline text-xs font-bold">{opt.label}</span>
			{/if}
		</Button>
	{/each}
</div>
