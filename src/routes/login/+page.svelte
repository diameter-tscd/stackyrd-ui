<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, toasts } from '$lib/stores/auth';
	import { connectionStatus } from '$lib/stores/data';
	import { mcpCall } from '$lib/api/mcp';
	import {
		connections,
		setupVault,
		unlockVault,
		lockVault,
		addConnection,
		updateConnection,
		deleteConnection,
		setActiveConnection,
		getError
	} from '$lib/stores/connections';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardTitle from '$lib/components/ui/card-title.svelte';
	import CardDescription from '$lib/components/ui/card-description.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Separator from '$lib/components/ui/separator.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Alert from '$lib/components/ui/alert.svelte';
	import AlertTitle from '$lib/components/ui/alert-title.svelte';
	import AlertDescription from '$lib/components/ui/alert-description.svelte';
	import { env } from '$env/dynamic/public';
 	import { Eye, EyeOff, ShieldAlert, Plus, Pencil, Trash2, Unlock, LogOut } from 'lucide-svelte';

	const PUBLIC_API_URL = env.PUBLIC_API_URL || 'http://localhost:8080';

	let view = $derived($connections.view);
	let loading = $derived($connections.loading);
	let error = $derived($connections.error);
	let connList = $derived($connections.connections);
	let activeId = $derived($connections.activeId);

	let sessionChecking = $state(true);

	// Setup form
	let setupPassword = $state('');
	let setupPasswordConfirm = $state('');
	let setupName = $state('');
	let setupApiUrl = $state(PUBLIC_API_URL);
	let setupMcpUrl = $state('/mcp');
	let setupToken = $state('');
	let showSetupToken = $state(false);
	let setupError = $state('');

	// Unlock form
	let unlockPassword = $state('');
	let unlockError = $state('');

	// Manager form
	let mgrName = $state('');
	let mgrApiUrl = $state(PUBLIC_API_URL);
	let mgrMcpUrl = $state('/mcp');
	let mgrToken = $state('');
	let showMgrToken = $state(false);
	let mgrError = $state('');
	let editingId = $state<string | null>(null);

	onMount(async () => {
		if ($auth.authenticated) {
			await goto('/', { replaceState: true });
			return;
		}
		sessionChecking = false;
	});

	function resetSetupForm() {
		setupPassword = '';
		setupPasswordConfirm = '';
		setupName = '';
		setupApiUrl = PUBLIC_API_URL;
		setupMcpUrl = '/mcp';
		setupToken = '';
		setupError = '';
	}

	function resetMgrForm() {
		mgrName = '';
		mgrApiUrl = PUBLIC_API_URL;
		mgrMcpUrl = '/mcp';
		mgrToken = '';
		mgrError = '';
		editingId = null;
	}

	async function handleSetup() {
		setupError = '';
		if (!setupPassword) {
			setupError = 'Master password is required';
			return;
		}
		if (setupPassword !== setupPasswordConfirm) {
			setupError = 'Passwords do not match';
			return;
		}
 		if (!setupName.trim()) {
			setupError = 'Connection name is required';
			return;
		}
		if (!setupApiUrl.trim()) {
			setupError = 'API URL is required';
			return;
		}
		if (!setupMcpUrl.trim()) {
			setupError = 'MCP URL is required';
			return;
		}
		if (!setupToken.trim()) {
			setupError = 'API token is required';
			return;
		}
		const success = await setupVault(setupPassword, {
			name: setupName.trim(),
			apiUrl: setupApiUrl.trim(),
			mcpUrl: setupMcpUrl.trim(),
			token: setupToken.trim()
		});
		if (success) {
			resetSetupForm();
			toasts.add('success', 'Vault created');
		} else {
			setupError = getError() || 'Failed to create vault';
		}
	}

	async function handleUnlock() {
		unlockError = '';
		if (!unlockPassword) {
			unlockError = 'Master password is required';
			return;
		}
		const success = await unlockVault(unlockPassword);
		if (!success) {
			unlockError = 'Invalid master password';
		}
		unlockPassword = '';
	}

 	async function handleAddConnection() {
		mgrError = '';
		if (!mgrName.trim()) {
			mgrError = 'Connection name is required';
			return;
		}
		if (!mgrApiUrl.trim()) {
			mgrError = 'API URL is required';
			return;
		}
		if (!mgrMcpUrl.trim()) {
			mgrError = 'MCP URL is required';
			return;
		}
		if (!mgrToken.trim()) {
			mgrError = 'API token is required';
			return;
		}
		const success = await addConnection({
			name: mgrName.trim(),
			apiUrl: mgrApiUrl.trim(),
			mcpUrl: mgrMcpUrl.trim(),
			token: mgrToken.trim()
		});
		if (success) {
			resetMgrForm();
			toasts.add('success', 'Connection added');
		} else {
			mgrError = getError() || 'Failed to add connection';
		}
	}

	async function handleUpdateConnection() {
		if (!editingId) return;
		mgrError = '';
		const success = await updateConnection(editingId, {
			name: mgrName.trim(),
			apiUrl: mgrApiUrl.trim(),
			mcpUrl: mgrMcpUrl.trim(),
			token: mgrToken.trim()
		});
		if (success) {
			resetMgrForm();
			toasts.add('success', 'Connection updated');
		} else {
			mgrError = getError() || 'Failed to update connection';
		}
	}

	async function handleDeleteConnection(id: string) {
		await deleteConnection(id);
		toasts.add('info', 'Connection deleted');
	}

	async function handleActivateConnection(id: string) {
		const success = await setActiveConnection(id);
		if (success) {
			toasts.add('success', 'Connection activated');
			await goto('/', { replaceState: true });
		} else {
			mgrError = getError() || 'Failed to connect';
		}
	}

	function startEdit(conn: { id: string; name: string; apiUrl: string; mcpUrl: string; token: string }) {
		editingId = conn.id;
		mgrName = conn.name;
		mgrApiUrl = conn.apiUrl;
		mgrMcpUrl = conn.mcpUrl;
		mgrToken = conn.token;
		mgrError = '';
	}

	function handleLock() {
		lockVault();
		resetMgrForm();
	}
</script>

<svelte:head>
	<title>Login - Stackyrd</title>
	<meta name="description" content="Login - Stackyrd" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4 bg-background">
	<div class="w-full max-w-md space-y-6">
		<div class="text-center space-y-3">
			<h1 class="text-3xl font-bold tracking-tight">stackyrd</h1>
			<p class="text-sm text-muted-foreground">
				{#if view === 'setup'}Create your encrypted vault
				{:else if view === 'unlock'}Unlock your vault
				{:else}Manage connections{/if}
			</p>
		</div>

		{#if sessionChecking}
			<Card>
				<CardContent class="flex flex-col items-center justify-center py-8 gap-3">
					<Spinner size="sm" />
					<p class="text-xs font-semibold text-muted-foreground">Checking session…</p>
				</CardContent>
			</Card>
		{:else if view === 'setup'}
			<Card>
				<CardHeader>
					<CardTitle>Create vault</CardTitle>
					<CardDescription>Set a master password and add your first connection</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if setupError}
						<Alert variant="destructive" class="bg-red-600 text-white border-red-600 [&>svg]:text-white">
							<ShieldAlert class="h-4 w-4 text-white" />
							<AlertTitle class="text-sm font-bold text-white">Error</AlertTitle>
							<AlertDescription class="text-xs font-semibold text-white">{setupError}</AlertDescription>
						</Alert>
					{/if}
					<form autocomplete="off" onsubmit={(e) => { e.preventDefault(); handleSetup(); }} class="space-y-4">
						<div class="space-y-3">
							<Label for="setup-password">Master Password</Label>
							<Input id="setup-password" type="password" bind:value={setupPassword} placeholder="Create a strong master password" autocomplete="new-password" />
						</div>
						<div class="space-y-3">
							<Label for="setup-password-confirm">Confirm Password</Label>
							<Input id="setup-password-confirm" type="password" bind:value={setupPasswordConfirm} placeholder="Confirm master password" autocomplete="new-password" />
						</div>
						<Separator />
						<div class="space-y-3">
							<Label for="setup-name">Connection Name</Label>
							<Input id="setup-name" type="text" bind:value={setupName} placeholder="e.g. Local Dev" />
						</div>
 					<div class="space-y-3">
						<Label for="setup-api-url">API URL</Label>
						<Input id="setup-api-url" type="text" bind:value={setupApiUrl} placeholder="http://localhost:8080" />
					</div>
					<div class="space-y-3">
						<Label for="setup-mcp-url">MCP URL</Label>
						<Input id="setup-mcp-url" type="text" bind:value={setupMcpUrl} placeholder="/mcp" />
					</div>
						<div class="space-y-3">
							<Label for="setup-token">API Token</Label>
							<div class="relative">
								<Input id="setup-token" type={showSetupToken ? 'text' : 'password'} bind:value={setupToken} placeholder="Enter your bearer token" autocomplete="new-password" class="pr-12" />
								<button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onclick={() => showSetupToken = !showSetupToken} aria-label={showSetupToken ? 'Hide token' : 'Show token'}>
									{#if showSetupToken}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}
								</button>
							</div>
						</div>
						<Button variant="default" class="w-full" type="submit" disabled={loading} aria-busy={loading}>
							{#if loading}
								<Spinner size="sm" />
								<span>Creating vault...</span>
							{:else}
								<span>Create vault</span>
							{/if}
						</Button>
					</form>
				</CardContent>
			</Card>

		{:else if view === 'unlock'}
			<Card>
				<CardHeader>
					<CardTitle>Unlock vault</CardTitle>
					<CardDescription>Enter your master password to access your connections</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if unlockError}
						<Alert variant="destructive" class="bg-red-600 text-white border-red-600 [&>svg]:text-white">
							<ShieldAlert class="h-4 w-4 text-white" />
							<AlertTitle class="text-sm font-bold text-white">Error</AlertTitle>
							<AlertDescription class="text-xs font-semibold text-white">{unlockError}</AlertDescription>
						</Alert>
					{/if}
					<form autocomplete="off" onsubmit={(e) => { e.preventDefault(); handleUnlock(); }} class="space-y-4">
						<div class="space-y-3">
							<Label for="unlock-password">Master Password</Label>
							<Input id="unlock-password" type="password" bind:value={unlockPassword} placeholder="Enter master password" autocomplete="off" />
						</div>
						<Button variant="default" class="w-full" type="submit" disabled={loading} aria-busy={loading}>
							{#if loading}
								<Spinner size="sm" />
								<span>Unlocking...</span>
							{:else}
								<Unlock class="h-4 w-4" />
								<span>Unlock</span>
							{/if}
						</Button>
					</form>
				</CardContent>
			</Card>

		{:else if view === 'manager'}
			<Card>
				<CardHeader>
					<div class="flex items-center justify-between">
						<div>
							<CardTitle>Connections</CardTitle>
							<CardDescription>{connList.length} saved connection{connList.length !== 1 ? 's' : ''}</CardDescription>
						</div>
						<Button variant="outline" size="sm" onclick={handleLock}>
							<LogOut class="h-4 w-4" />
							Lock
						</Button>
					</div>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if mgrError}
						<Alert variant="destructive" class="bg-red-600 text-white border-red-600 [&>svg]:text-white">
							<ShieldAlert class="h-4 w-4 text-white" />
							<AlertTitle class="text-sm font-bold text-white">Error</AlertTitle>
							<AlertDescription class="text-xs font-semibold text-white">{mgrError}</AlertDescription>
						</Alert>
					{/if}

 			{#if connList.length > 0}
					<div class="space-y-2">
						{#each connList as conn (conn.id)}
							<button
								type="button"
								class="w-full flex items-center justify-between p-3 rounded-2xl border-2 border-black bg-card hover:bg-muted/30 transition-colors text-left cursor-pointer"
								onclick={() => handleActivateConnection(conn.id)}
								disabled={loading}
								aria-label={`Connect to ${conn.name}`}
							>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="text-sm font-semibold truncate">{conn.name}</span>
										{#if conn.id === activeId}
											<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-p5-green text-black border border-black">active</span>
										{:else}
											<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">click to use</span>
										{/if}
									</div>
									<p class="text-xs text-muted-foreground truncate">{conn.apiUrl}</p>
								</div>
 								<div class="flex items-center gap-1 ml-2" role="group" aria-label="Actions">
									<Button variant="ghost" size="icon" onclick={(e) => { e.stopPropagation(); startEdit(conn); }} aria-label="Edit">
										<Pencil class="h-4 w-4" />
									</Button>
									<Button variant="ghost" size="icon" onclick={(e) => { e.stopPropagation(); handleDeleteConnection(conn.id); }} aria-label="Delete">
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</button>
						{/each}
					</div>
					{:else}
						<p class="text-sm text-muted-foreground text-center py-4">No connections yet. Add one below.</p>
					{/if}

					<Separator />

					<div class="space-y-3">
						<h4 class="text-sm font-semibold">{editingId ? 'Edit connection' : 'Add connection'}</h4>
						<div class="space-y-3">
							<Label for="mgr-name">Name</Label>
							<Input id="mgr-name" type="text" bind:value={mgrName} placeholder="Connection name" />
						</div>
 					<div class="space-y-3">
						<Label for="mgr-api-url">API URL</Label>
						<Input id="mgr-api-url" type="text" bind:value={mgrApiUrl} placeholder="http://localhost:8080" />
					</div>
					<div class="space-y-3">
						<Label for="mgr-mcp-url">MCP URL</Label>
						<Input id="mgr-mcp-url" type="text" bind:value={mgrMcpUrl} placeholder="/mcp" />
					</div>
						<div class="space-y-3">
							<Label for="mgr-token">API Token</Label>
							<div class="relative">
								<Input id="mgr-token" type={showMgrToken ? 'text' : 'password'} bind:value={mgrToken} placeholder="Bearer token" autocomplete="new-password" class="pr-12" />
								<button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onclick={() => showMgrToken = !showMgrToken} aria-label={showMgrToken ? 'Hide token' : 'Show token'}>
									{#if showMgrToken}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}
								</button>
							</div>
						</div>
						<div class="flex gap-2">
							{#if editingId}
								<Button variant="default" class="flex-1" onclick={handleUpdateConnection} disabled={loading} aria-busy={loading}>
									{#if loading}
										<Spinner size="sm" />
									{:else}
										<span>Update</span>
									{/if}
								</Button>
								<Button variant="outline" onclick={resetMgrForm}>Cancel</Button>
							{:else}
								<Button variant="default" class="flex-1" onclick={handleAddConnection} disabled={loading} aria-busy={loading}>
									{#if loading}
										<Spinner size="sm" />
									{:else}
										<Plus class="h-4 w-4" />
										<span>Add</span>
									{/if}
								</Button>
							{/if}
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}

		<p class="text-center text-xs text-muted-foreground">
			Connections are encrypted with AES-256-GCM and stored locally.
		</p>
	</div>
</div>
