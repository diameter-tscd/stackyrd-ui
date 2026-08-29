<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import { animate } from "motion";

	let {
		class: className,
		children,
		onclick,
		...rest
	}: {
		class?: string;
		children?: Snippet;
		onclick?: (e: MouseEvent) => void;
		[key: string]: unknown;
	} = $props();

	function hoverAnim(node: HTMLElement) {
		const onEnter = () => {
			const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			if (prefersReduced) return;
 // -ignore
			(animate as any)(node as any, { y: -2, scale: 1.005 }, { duration: 0.2, easing: "ease-out" });
		};
		const onLeave = () => {
 // -ignore
			(animate as any)(node as any, { y: 0, scale: 1 }, { duration: 0.2, easing: "ease-out" });
		};
		node.addEventListener("mouseenter", onEnter);
		node.addEventListener("mouseleave", onLeave);
		return {
			destroy() {
				node.removeEventListener("mouseenter", onEnter);
				node.removeEventListener("mouseleave", onLeave);
			}
		};
	}
</script>

<div class={cn("rounded-2xl border-2 border-black bg-card text-card-foreground shadow-sm transition-shadow", className)} {onclick} {@attach hoverAnim} {...rest}>
	{@render children?.()}
</div>
