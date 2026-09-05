<script lang="ts">
	import { connectionStatus } from '$lib/stores/data';
	import { toasts } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import Alert from '$lib/components/ui/alert.svelte';
	import AlertTitle from '$lib/components/ui/alert-title.svelte';
	import AlertDescription from '$lib/components/ui/alert-description.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { AlertTriangle, RefreshCw, Settings, X, WifiOff } from 'lucide-svelte';
	import { animate } from "motion";

	let dismissed = $state(false);

	$effect(() => {
		if ($connectionStatus !== 'disconnected') {
			dismissed = false;
		}
	});

	function motionBanner(node: HTMLElement) {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute('data-disable-anim')) return;
 // -ignore
		(animate as any)(node as any, { y: [-16, 0], opacity: [0, 1], scale: [0.97, 1] }, { duration: 0.4, easing: [0.34, 1.56, 0.64, 1] as unknown as string });
	}

	function dismiss() {
		const el = document.querySelector('[data-connection-banner]') as HTMLElement | null;
		if (!el) {
			dismissed = true;
			return;
		}
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute('data-disable-anim')) {
			dismissed = true;
			return;
		}
 // -ignore
		(animate as any)(el as any, { y: [0, -12], opacity: [1, 0], scale: [1, 0.98] }, { duration: 0.25, easing: "ease-in" }).finished.then(() => dismissed = true);
	}

	function goSettings() {
		goto('/settings');
	}

	function retry() {
		toasts.add('info', 'Retrying connection…', 2000);
		location.reload();
	}

	let visible = $derived($connectionStatus === 'disconnected' && !dismissed);
</script>

{#if visible}
	<div data-connection-banner {@attach motionBanner} class="mb-6" role="alert" aria-live="assertive" style="font-family: var(--font-sans);">
		<Alert variant="destructive" class="shadow-md">
			<WifiOff class="h-5 w-5" aria-hidden="true" />
			<AlertTitle class="flex items-center justify-between gap-2 text-base font-bold">
				<span class="flex items-center gap-2"><AlertTriangle class="h-4 w-4" /> Connection lost</span>
				<button
					aria-label="Dismiss alert"
					onclick={dismiss}
					class="rounded-full border-2 border-current p-1 hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<X class="h-4 w-4" />
				</button>
			</AlertTitle>
			<AlertDescription class="mt-3">
				<p class="text-sm font-semibold leading-relaxed">
					Unable to reach your stackyrd instance. Check that the Go server is running on <code class="bg-white text-black px-1.5 py-0.5 rounded-full text-xs border-2 border-black font-mono">:8080</code> and your API token is valid.
				</p>
				<div class="flex flex-wrap gap-2 mt-4">
					<Button variant="outline" size="sm" onclick={retry} class="rounded-full border-white bg-white text-black hover:bg-black hover:text-white dark:bg-black dark:text-white dark:border-white">
						<RefreshCw class="h-3.5 w-3.5" />
						Retry
					</Button>
					<Button variant="ghost" size="sm" onclick={goSettings} class="rounded-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black dark:border-black dark:text-black">
						<Settings class="h-3.5 w-3.5" />
						Settings
					</Button>
					<Button variant="ghost" size="sm" onclick={dismiss} class="rounded-full text-white/80 hover:text-white hover:bg-white/10">Dismiss</Button>
				</div>
			</AlertDescription>
		</Alert>
	</div>
{/if}
