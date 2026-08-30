<script lang="ts">
	import { connections, setActiveConnection, lockVault } from '$lib/stores/connections';
	import { sidebarCollapsed } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { ChevronDown, ChevronUp, Lock, Server } from 'lucide-svelte';
	import { cn } from '$lib/utils.js';

	let open = $state(false);

	let connList = $derived($connections.connections);
	let activeId = $derived($connections.activeId);

	let activeConnection = $derived(connList.find((c) => c.id === activeId));

	async function switchConnection(id: string) {
		const success = await setActiveConnection(id);
		if (success) {
			open = false;
		}
	}

	function handleLock() {
		lockVault();
		open = false;
		goto('/login', { replaceState: true });
	}
</script>

<div class="px-3 pb-3">
	{#if $sidebarCollapsed}
		<button
			type="button"
			class="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-full text-xs font-medium border-2 border-black bg-card hover:bg-accent transition-colors"
			onclick={() => open = !open}
			aria-label="Connection switcher"
		>
			<Server class="h-4 w-4 shrink-0" />
		</button>
	{:else}
		<button
			type="button"
			class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-full text-xs font-medium border-2 border-black bg-card hover:bg-accent transition-colors"
			onclick={() => open = !open}
		>
			<span class="flex items-center gap-2 min-w-0">
				<Server class="h-4 w-4 shrink-0" />
				<span class="truncate">{activeConnection?.name || 'No connection'}</span>
			</span>
			{#if open}
				<ChevronUp class="h-3 w-3 shrink-0" />
			{:else}
				<ChevronDown class="h-3 w-3 shrink-0" />
			{/if}
		</button>
	{/if}

	{#if open}
		<div class="mt-2 space-y-1 rounded-2xl border-2 border-black bg-card p-2 shadow-sm">
			{#each connList as conn (conn.id)}
				<button
					type="button"
					class={cn(
						"w-full flex items-center gap-2 px-2 py-1.5 rounded-full text-xs font-medium transition-colors text-left",
						conn.id === activeId
							? 'bg-p5-yellow text-black border-2 border-black'
							: 'hover:bg-accent border-2 border-transparent'
					)}
					onclick={() => switchConnection(conn.id)}
				>
					<Server class="h-3 w-3 shrink-0" />
					<span class="truncate flex-1">{conn.name}</span>
				</button>
			{/each}
			<div class="pt-1 border-t border-border">
				<button
					type="button"
					class="w-full flex items-center gap-2 px-2 py-1.5 rounded-full text-xs font-medium hover:bg-accent transition-colors text-left"
					onclick={handleLock}
				>
					<Lock class="h-3 w-3 shrink-0" />
					<span>Lock vault</span>
				</button>
			</div>
		</div>
	{/if}
</div>
