<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, toasts } from '$lib/stores/auth';
	import { connectionStatus } from '$lib/stores/data';
	import { mcpCall } from '$lib/api/mcp';
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
	import { Eye, EyeOff, ShieldAlert } from 'lucide-svelte';

	const PUBLIC_API_URL = env.PUBLIC_API_URL || 'http://localhost:8080';

	let apiUrl = $state(PUBLIC_API_URL);
	let token = $state('');
	let loading = $state(false);
	let remember = $state(true);
	let showToken = $state(false);
	let sessionChecking = $state(true);
	let tokenError = $state('');

	let checkingToken: string | null = null;

	onMount(async () => {
		if ($auth.apiUrl) apiUrl = $auth.apiUrl;
		if ($auth.authenticated && $auth.token) {
			checkingToken = $auth.token;
			try {
				await mcpCall(checkingToken, 'ping');
				await goto('/', { replaceState: true });
				return;
			} catch {
				if (checkingToken !== $auth.token) return;
				auth.logout();
				connectionStatus.set('disconnected');
				tokenError = 'Invalid token — session expired or token is not authorized. Please sign in again.';
			} finally {
				checkingToken = null;
			}
		} else if ($auth.authenticated) {
			auth.logout();
		}
		sessionChecking = false;
	});

	async function handleLogin() {
		if (!token.trim()) {
			tokenError = 'Please enter an API token';
			return;
		}
		tokenError = '';
		loading = true;
		connectionStatus.set('checking');
		const attemptToken = token.trim();
		try {
			await mcpCall(attemptToken, 'ping');
			auth.setToken(attemptToken);
			auth.setUrls(apiUrl, '/mcp');
			auth.setAuthenticated(true);
			connectionStatus.set('connected');
			toasts.add('success', 'Connected successfully');
			await goto('/', { replaceState: true });
		} catch (e) {
			const msg = (e as Error)?.message || '';
			const raw = String((e as { data?: unknown })?.data ?? msg).toLowerCase();
			const isAuth =
				msg.toLowerCase().includes('unauthorized') ||
				msg.toLowerCase().includes('401') ||
				msg.toLowerCase().includes('403') ||
				msg.toLowerCase().includes('invalid token') ||
				msg.toLowerCase().includes('forbidden') ||
				msg.toLowerCase().includes('unauthenticated') ||
				raw.includes('unauthorized') ||
				raw.includes('forbidden');
			tokenError = isAuth
				? 'Invalid token — not authorized. Please check your token and try again.'
				: 'Failed to connect. Check your token and API URL.';
			connectionStatus.set('disconnected');
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
				{#if sessionChecking}
					<div class="flex flex-col items-center justify-center py-8 gap-3">
						<Spinner size="sm" />
						<p class="text-xs font-semibold text-muted-foreground">Verifying session…</p>
					</div>
				{:else}
				{#if tokenError}
					<Alert variant="destructive" class="bg-red-600 text-white border-red-600 [&>svg]:text-white dark:bg-red-600 dark:text-white dark:border-red-600 [&>svg]:dark:text-white">
						<ShieldAlert class="h-4 w-4 text-white" />
						<AlertTitle class="text-sm font-bold text-white">Invalid token</AlertTitle>
						<AlertDescription class="text-xs font-semibold text-white">{tokenError}</AlertDescription>
					</Alert>
				{/if}
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

					<Button variant="default" class="w-full" type="submit" disabled={loading || sessionChecking} aria-busy={loading}>
						{#if loading}
							<Spinner size="sm" />
							<span>Connecting...</span>
						{:else}
							<span>Connect</span>
						{/if}
					</Button>
				</form>
				{/if}
			</CardContent>
		</Card>

		<p class="text-center text-xs text-muted-foreground">
			Dev: Vite proxies <code class="bg-muted px-1 rounded">/api /mcp /health /metrics</code> → <code class="bg-muted px-1 rounded">:8080</code>. No CORS needed.
		</p>
	</div>
</div>
