<script lang="ts">
	import { toasts } from '$lib/stores/auth';
	import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';
	import type { Toast as ToastType } from '$lib/stores/auth';
	import { cn } from "$lib/utils.js";
	import { animate } from "motion";

	const icons = {
		success: CheckCircle,
		error: XCircle,
		warning: AlertTriangle,
		info: Info
	};

	const toastColors: Record<ToastType['type'], string> = {
		success: 'bg-p5-green text-black border-black',
		error: 'bg-black text-white border-black dark:bg-white dark:text-black',
		warning: 'bg-p5-yellow text-black border-black',
		info: 'bg-p5-blue text-black border-black'
	};

	const iconColors: Record<ToastType['type'], string> = {
		success: 'text-black',
		error: 'text-white dark:text-black',
		warning: 'text-black',
		info: 'text-black'
	};

	function motionIn(node: HTMLElement) {
		const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (prefersReduced) return;
 // -ignore
		(animate as any)(node as any, { x: [80, 0], opacity: [0, 1], scale: [0.96, 1] }, { duration: 0.4, easing: [0.34, 1.56, 0.64, 1] as unknown as string });
	}

	function dismissWithMotion(id: string, node: HTMLElement) {
		const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (prefersReduced) {
			toasts.dismiss(id);
			return;
		}
 // -ignore
		(animate as any)(node as any, { x: [0, 40], opacity: [1, 0], scale: [1, 0.96] }, { duration: 0.25, easing: "ease-in" }).finished.then(() => toasts.dismiss(id));
	}
</script>

{#if $toasts.length > 0}
	<div class="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-[calc(100%-2rem)] sm:w-full" role="region" aria-live="polite" aria-label="Notifications">
		{#each $toasts as toast (toast.id)}
			{@const Icon = icons[toast.type]}
			<div
				role="alert"
				class={cn("flex items-start gap-3 p-4 rounded-2xl border-2 shadow-lg", toastColors[toast.type])}
				style="font-family: var(--font-sans);"
				{@attach motionIn}
				onmouseenter={(e) => {
					const t = e.currentTarget as HTMLElement;
 // -ignore
					(animate as any)(t as any, { scale: 1.02 }, { duration: 0.15 });
				}}
				onmouseleave={(e) => {
					const t = e.currentTarget as HTMLElement;
 // -ignore
					(animate as any)(t as any, { scale: 1 }, { duration: 0.15 });
				}}
			>
				<Icon class={cn("w-5 h-5 shrink-0 mt-0.5", iconColors[toast.type])} aria-hidden="true" />
				<p class="text-sm font-semibold leading-snug flex-1">{toast.message}</p>
				<button
					class="shrink-0 rounded-full border-2 border-current p-1 hover:bg-black hover:text-white dark:hover:bg-black dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onclick={(e) => {
						const n = (e.currentTarget as HTMLElement).closest('[role="alert"]') as HTMLElement;
						if (n) dismissWithMotion(toast.id, n); else toasts.dismiss(toast.id);
					}}
					aria-label="Dismiss notification"
				>
					<X class="w-3.5 h-3.5" />
				</button>
			</div>
		{/each}
	</div>
{/if}
