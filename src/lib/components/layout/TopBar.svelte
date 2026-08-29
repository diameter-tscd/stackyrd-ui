<script lang="ts">
	import { sidebarCollapsed, auth } from '$lib/stores/auth';
	import { connectionStatus } from '$lib/stores/data';
	import { Circle, LogOut, Clock } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { cn } from "$lib/utils.js";
	import Separator from "$lib/components/ui/separator.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import ThemeToggle from "$lib/components/ui/theme-toggle.svelte";

	let currentTime = $state('');

	onMount(() => {
		const update = () => {
			currentTime = new Date().toLocaleTimeString();
		};
		update();
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	});

	const statusConfig: Record<string, { color: string; label: string; dot: string }> = {
		connected: { color: 'text-emerald-500', label: 'Connected', dot: 'bg-emerald-500' },
		disconnected: { color: 'text-black dark:text-white', label: 'Disconnected', dot: 'bg-black dark:bg-white' },
		checking: { color: 'text-amber-500', label: 'Connecting', dot: 'bg-amber-400' }
	};
</script>

<header
	class={cn(
		"fixed top-0 right-0 h-16 bg-background border-b-2 border-black flex items-center justify-between px-4 z-20 transition-all duration-200",
		$sidebarCollapsed ? 'left-16' : 'left-64'
	)}
>
	<div class="flex items-center gap-3">
		<span class="hidden sm:flex items-center gap-2 rounded-full border-2 border-black px-3 py-1.5 bg-p5-yellow">
			<span class={cn("h-2.5 w-2.5 rounded-full", statusConfig[$connectionStatus]?.dot)} aria-hidden="true"></span>
			<span class="text-xs font-semibold tracking-wide uppercase">{statusConfig[$connectionStatus]?.label ?? $connectionStatus}</span>
			<Circle class={cn("h-2 w-2 fill-current opacity-30", statusConfig[$connectionStatus]?.color)} aria-hidden="true" />
		</span>
		<Separator orientation="vertical" class="h-6 hidden sm:block bg-black" />
		<span class="hidden lg:inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground border-2 border-black rounded-full px-2.5 py-1 bg-card">
			<Clock class="h-3.5 w-3.5" aria-hidden="true" />
			<time>{currentTime}</time>
		</span>
	</div>

	<div class="flex items-center gap-2">
		<ThemeToggle />
		<Separator orientation="vertical" class="h-6 hidden sm:block bg-black" />
		<Button variant="outline" size="sm" onclick={() => auth.logout()} aria-label="Logout" class="rounded-full border-black">
			<LogOut class="h-4 w-4" />
			<span class="hidden sm:inline">Logout</span>
		</Button>
	</div>
</header>
