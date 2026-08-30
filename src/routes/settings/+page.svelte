<script lang="ts">
	import { theme } from '$lib/stores/auth';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardTitle from '$lib/components/ui/card-title.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import CardDescription from '$lib/components/ui/card-description.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Separator from '$lib/components/ui/separator.svelte';
	import { Settings } from 'lucide-svelte';
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
