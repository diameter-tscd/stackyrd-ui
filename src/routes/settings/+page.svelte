<script lang="ts">
	import { auth, theme, toasts } from '$lib/stores/auth';
	import { getHealth } from '$lib/api/endpoints';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardTitle from '$lib/components/ui/card-title.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import CardDescription from '$lib/components/ui/card-description.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Separator from '$lib/components/ui/separator.svelte';
	import { Settings, Wifi, WifiOff, Eye, EyeOff } from 'lucide-svelte';
	import ThemeToggle from '$lib/components/ui/theme-toggle.svelte';
	import { PUBLIC_API_URL, PUBLIC_MCP_URL } from '$env/static/public';

	let apiUrl = $state(PUBLIC_API_URL);
	let mcpUrl = $state(PUBLIC_MCP_URL);
	let token = $state('');
	let testing = $state(false);
	let connected = $state(false);
	let showToken = $state(false);

	function loadCurrent() {
		apiUrl = $auth.apiUrl || PUBLIC_API_URL;
		mcpUrl = $auth.mcpUrl || PUBLIC_MCP_URL;
		token = $auth.token;
	}

	async function testConnection() {
		testing = true;
		try {
			await getHealth(token);
			connected = true;
			toasts.add('success', 'Connection successful');
		} catch {
			connected = false;
			toasts.add('error', 'Connection failed');
		} finally {
			testing = false;
		}
	}

	function saveConnection() {
		auth.setToken(token);
		auth.setUrls(apiUrl, mcpUrl);
		toasts.add('success', 'Connection settings saved');
	}

	loadCurrent();
</script>

<PageHeader title="Settings" subtitle="Dashboard connection and preferences" />

<div class="space-y-4 max-w-2xl">
	<Card>
		<CardHeader>
			<div class="flex items-center gap-2">
				<Settings class="w-5 h-5 text-primary" aria-hidden="true" />
				<CardTitle>Connection</CardTitle>
			</div>
			<CardDescription>Configure API and MCP endpoints for the dashboard</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-3">
				<Label for="api-url">API URL</Label>
				<Input id="api-url" type="url" bind:value={apiUrl} placeholder="http://localhost:8080" />
			</div>
			<div class="space-y-3">
				<Label for="mcp-url">MCP URL</Label>
				<Input id="mcp-url" type="url" bind:value={mcpUrl} placeholder="http://localhost:8080/mcp" />
			</div>
			<div class="space-y-3">
				<Label for="api-token">API Token</Label>
				<div class="relative">
					<Input id="api-token" type={showToken ? 'text' : 'password'} bind:value={token} placeholder="Bearer token" autocomplete="new-password" class="pr-12" />
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
			<div class="flex gap-2 pt-2">
				<Button variant="secondary" onclick={testConnection} disabled={testing} aria-busy={testing}>
					{#if testing}
						<span>Testing...</span>
					{:else if connected}
						<span class="flex items-center gap-1"><Wifi class="w-4 h-4" /> Connected</span>
					{:else}
						<span class="flex items-center gap-1"><WifiOff class="w-4 h-4" /> Test Connection</span>
					{/if}
				</Button>
				<Button variant="default" onclick={saveConnection}>Save</Button>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Appearance</CardTitle>
			<CardDescription>Switch between light, dark and night — persists to localStorage</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="space-y-3">
				<Label>Theme</Label>
				<ThemeToggle showLabels={true} size="default" />
				<p class="text-xs text-muted-foreground">Night is true-black OLED — saves power, reduces eye strain in dark rooms.</p>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Polling Intervals</CardTitle>
			<CardDescription>Automatic refresh rates for live data</CardDescription>
		</CardHeader>
		<CardContent class="space-y-3 text-sm">
			<div class="flex justify-between text-muted-foreground">
				<span>Health / Connection</span>
				<span class="text-foreground font-medium">5s</span>
			</div>
			<Separator />
			<div class="flex justify-between text-muted-foreground">
				<span>Infrastructure</span>
				<span class="text-foreground font-medium">5s</span>
			</div>
			<Separator />
			<div class="flex justify-between text-muted-foreground">
				<span>Services</span>
				<span class="text-foreground font-medium">15s</span>
			</div>
			<Separator />
			<div class="flex justify-between text-muted-foreground">
				<span>Metrics</span>
				<span class="text-foreground font-medium">10s</span>
			</div>
			<Separator />
			<div class="flex justify-between text-muted-foreground">
				<span>Endpoints</span>
				<span class="text-foreground font-medium">30s</span>
			</div>
		</CardContent>
	</Card>
</div>
