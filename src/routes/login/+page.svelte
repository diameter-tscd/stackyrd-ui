<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, toasts } from '$lib/stores/auth';
	import { connectionStatus } from '$lib/stores/data';
	import { getHealth } from '$lib/api/endpoints';
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
	import { PUBLIC_API_URL, PUBLIC_MCP_URL } from '$env/static/public';
	import { Eye, EyeOff } from 'lucide-svelte';

	let apiUrl = $state(PUBLIC_API_URL);
	let token = $state('');
	let loading = $state(false);
	let remember = $state(true);
	let showToken = $state(false);

	onMount(() => {
		if ($auth.authenticated) {
			goto('/');
		}
		if ($auth.apiUrl) {
			apiUrl = $auth.apiUrl;
		}
	});

	async function handleLogin() {
		if (!token.trim()) {
			toasts.add('error', 'Please enter an API token');
			return;
		}
		loading = true;
		connectionStatus.set('checking');
		try {
			await getHealth(token);
			auth.setToken(token);
			auth.setUrls(apiUrl, '/mcp');
			auth.setAuthenticated(true);
			connectionStatus.set('connected');
			toasts.add('success', 'Connected successfully');
			goto('/');
		} catch {
			connectionStatus.set('disconnected');
			toasts.add('error', 'Failed to connect. Check your token and API URL.');
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center p-4 bg-background">
	<div class="w-full max-w-md space-y-6">
		<div class="text-center space-y-3">
			<h1 class="text-3xl font-bold tracking-tight">stackyrd</h1>
			<p class="text-sm text-muted-foreground">Connect to your stackyrd instance</p>
		</div>

		<Card>
			<CardHeader>
				<CardTitle>Sign in</CardTitle>
				<CardDescription>Enter your API URL and bearer token to continue</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<form autocomplete="off" onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4">
					<div class="space-y-3">
						<Label for="login-api-url">API URL</Label>
						<Input id="login-api-url" type="url" bind:value={apiUrl} placeholder="http://localhost:8080" autocomplete="off" />
					</div>

					<div class="space-y-3">
						<Label for="login-api-token">API Token</Label>
						<div class="relative">
							<Input
								id="login-api-token"
								type={showToken ? 'text' : 'password'}
								bind:value={token}
								placeholder="Enter your bearer token"
								autocomplete="new-password"
								class="pr-12"
								onkeydown={(e) => e.key === 'Enter' && handleLogin()}
							/>
							<button
								type="button"
								class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onclick={() => showToken = !showToken}
								aria-label={showToken ? 'Hide token' : 'Show token'}
							>
								{#if showToken}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}
							</button>
						</div>
					</div>

					<label class="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
						<input type="checkbox" bind:checked={remember} class="rounded border-input bg-background" />
						Remember connection
					</label>

					<Separator />

					<Button variant="default" class="w-full" type="submit" onclick={handleLogin} disabled={loading} aria-busy={loading}>
						{#if loading}
							<Spinner size="sm" />
							<span>Connecting...</span>
						{:else}
							<span>Connect</span>
						{/if}
					</Button>
				</form>
			</CardContent>
		</Card>

		<p class="text-center text-xs text-muted-foreground">
			Dev: Vite proxies <code class="bg-muted px-1 rounded">/api /mcp /health /metrics</code> → <code class="bg-muted px-1 rounded">:8080</code>. No CORS needed.
		</p>
	</div>
</div>
