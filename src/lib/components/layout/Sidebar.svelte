<script lang="ts">
	import {
		LayoutDashboard,
		Server,
		HardDrive,
		BarChart3,
		ScrollText,
		Route,
		Settings,
		Cog,
		ChevronLeft,
		ChevronRight,
		Asterisk
	} from 'lucide-svelte';
	import { sidebarCollapsed } from '$lib/stores/auth';
	import { page } from '$app/stores';
	import { cn } from "$lib/utils.js";
	import Separator from "$lib/components/ui/separator.svelte";
	import Button from "$lib/components/ui/Button.svelte";

	interface NavItem {
		label: string;
		href: string;
		icon: typeof LayoutDashboard;
		match?: RegExp;
	}

	const navItems: NavItem[] = [
		{ label: 'Overview', href: '/', icon: LayoutDashboard, match: /^\/$/ },
		{ label: 'Services', href: '/services', icon: Server, match: /^\/services/ },
		{ label: 'Infrastructure', href: '/infrastructure', icon: HardDrive, match: /^\/infrastructure/ },
		{ label: 'Metrics', href: '/metrics', icon: BarChart3, match: /^\/metrics/ },
		{ label: 'Logs', href: '/logs', icon: ScrollText, match: /^\/logs/ },
		{ label: 'Endpoints', href: '/endpoints', icon: Route, match: /^\/endpoints/ },
		{ label: 'Config', href: '/config', icon: Settings, match: /^\/config/ },
		{ label: 'Settings', href: '/settings', icon: Cog, match: /^\/settings/ }
	];

	function isActive(item: NavItem): boolean {
		if (item.match) return item.match.test($page.url.pathname);
		return $page.url.pathname === item.href;
	}
</script>

<aside
	class={cn(
		"fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground border-r-2 border-black flex flex-col transition-all duration-200 z-30",
		$sidebarCollapsed ? 'w-16' : 'w-64'
	)}
	aria-label="Main navigation"
>
	<div class="flex items-center gap-3 h-16 px-4 border-b-2 border-black shrink-0 bg-sidebar">
		<span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
			<Asterisk class="h-5 w-5 animate-spin" style="animation-duration: 8s;" aria-hidden="true" />
		</span>
		{#if !$sidebarCollapsed}
			<span class="text-lg font-bold tracking-tight" style="font-family: var(--font-display);">stackyrd</span>
		{/if}
	</div>

	<nav class="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto" aria-label="Primary">
		{#each navItems as item}
			<a
				href={item.href}
				aria-current={isActive(item) ? 'page' : undefined}
				class={cn(
					"flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
					isActive(item)
						? 'bg-p5-yellow text-black border-black shadow-sm'
						: 'bg-transparent text-sidebar-foreground border-transparent hover:bg-accent hover:text-accent-foreground hover:border-black'
				)}
				title={$sidebarCollapsed ? item.label : undefined}
			>
				<svelte:component this={item.icon} class="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
				{#if !$sidebarCollapsed}
					<span>{item.label}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<div class="p-3 border-t-2 border-black bg-sidebar">
		<Button
			variant="outline"
			size="icon"
			class="w-full rounded-full border-black bg-background hover:bg-black hover:text-white"
			onclick={() => sidebarCollapsed.update((v) => !v)}
			aria-label={$sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
		>
			{#if $sidebarCollapsed}
				<ChevronRight class="h-4 w-4" />
			{:else}
				<ChevronLeft class="h-4 w-4" />
			{/if}
		</Button>
	</div>
</aside>
