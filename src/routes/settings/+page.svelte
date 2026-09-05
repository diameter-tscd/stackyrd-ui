<script lang="ts">
	import { theme } from '$lib/stores/auth';
	import { disableAnimation, rememberVaultSession } from '$lib/stores/settings';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardTitle from '$lib/components/ui/card-title.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import CardDescription from '$lib/components/ui/card-description.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Separator from '$lib/components/ui/separator.svelte';
	import { Settings, ZapOff, Vault, Shield } from 'lucide-svelte';
	import ThemeToggle from '$lib/components/ui/theme-toggle.svelte';
</script>

<PageHeader title="Settings" subtitle="Dashboard appearance and preferences" />

<div class="space-y-4 max-w-2xl">
	<Card>
		<CardHeader>
			<div class="flex items-center gap-2">
				<Settings class="w-5 h-5 text-primary" aria-hidden="true" />
				<CardTitle>Appearance</CardTitle>
			</div>
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
			<div class="flex items-center gap-2">
				<ZapOff class="w-5 h-5 text-primary" aria-hidden="true" />
				<CardTitle>Animations</CardTitle>
			</div>
			<CardDescription>Reduce motion for accessibility or performance</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="flex items-center justify-between gap-4">
				<div class="space-y-1">
					<Label for="disable-anim" class="text-sm font-semibold">Disable animations</Label>
					<p class="text-xs text-muted-foreground">Turns off page fly transitions, sidebar press effects and log row animations. Respects system prefers-reduced-motion.</p>
				</div>
				<button
					id="disable-anim"
					role="switch"
					aria-checked={$disableAnimation}
					aria-label="Disable animations"
					onclick={() => disableAnimation.update(v => !v)}
					class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {$disableAnimation ? 'bg-black' : 'bg-muted'}"
				>
					<span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white border border-black shadow transition-transform {$disableAnimation ? 'translate-x-6' : 'translate-x-0'}"></span>
				</button>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<div class="flex items-center gap-2">
				<Vault class="w-5 h-5 text-primary" aria-hidden="true" />
				<CardTitle>Vault Session</CardTitle>
			</div>
			<CardDescription>Keep vault unlocked across page reloads</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="flex items-center justify-between gap-4">
				<div class="space-y-1">
					<Label for="remember-vault" class="text-sm font-semibold">Remember vault session</Label>
					<p class="text-xs text-muted-foreground">When enabled, your vault stays unlocked after reload. Password is stored in localStorage until you lock manually. Disable to require password every time.</p>
				</div>
				<button
					id="remember-vault"
					role="switch"
					aria-checked={$rememberVaultSession}
					aria-label="Remember vault session"
					onclick={() => rememberVaultSession.update(v => !v)}
					class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {$rememberVaultSession ? 'bg-black' : 'bg-muted'}"
				>
					<span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white border border-black shadow transition-transform {$rememberVaultSession ? 'translate-x-6' : 'translate-x-0'}"></span>
				</button>
			</div>
			{#if $rememberVaultSession}
				<div class="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs">
					<Shield class="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
					<p class="text-amber-800 font-medium leading-relaxed">Vault password is kept in localStorage for auto-unlock. Anyone with device access can open it. Disable and lock vault for maximum security.</p>
				</div>
			{/if}
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
