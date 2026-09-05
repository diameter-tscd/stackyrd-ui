<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	export const alertVariants = tv({
		base: "relative w-full rounded-2xl border-2 px-6 py-5 text-sm font-semibold transition-colors [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-6 [&>svg]:top-6 [&>svg]:text-foreground [&>svg~*]:pl-8",
		variants: {
			variant: {
				default: "bg-p5-yellow text-black border-black [&>svg]:text-black",
				destructive: "bg-black text-white border-black [&>svg]:text-white dark:bg-white dark:text-black dark:border-black [&>svg]:dark:text-black",
				info: "bg-p5-blue text-black border-black [&>svg]:text-black",
				success: "bg-p5-green text-black border-black [&>svg]:text-black",
				warning: "bg-p5-yellow text-black border-black [&>svg]:text-black",
			},
		},
		defaultVariants: { variant: "default" },
	});

	export type AlertVariant = VariantProps<typeof alertVariants>["variant"];
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import { animate } from "motion";

	let {
		variant = "default",
		class: className,
		children,
		...rest
	}: {
		variant?: AlertVariant;
		class?: string;
		children?: Snippet;
	} = $props();

	function motionIn(node: HTMLElement) {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute('data-disable-anim')) return;
 // -ignore
		(animate as any)(node as any, { y: [-12, 0], opacity: [0, 1], scale: [0.98, 1] }, { duration: 0.35, easing: [0.34, 1.56, 0.64, 1] as unknown as string });
		node.addEventListener("mouseenter", () => {
			if (document.documentElement.hasAttribute('data-disable-anim')) return;
 // -ignore
			(animate as any)(node as any, { scale: 1.01 }, { duration: 0.15, easing: "ease-out" });
		});
		node.addEventListener("mouseleave", () => {
			if (document.documentElement.hasAttribute('data-disable-anim')) return;
 // -ignore
			(animate as any)(node as any, { scale: 1 }, { duration: 0.2, easing: "ease-out" });
		});
	}
</script>

<div {@attach motionIn} role="alert" class={cn(alertVariants({ variant }), "shadow-sm", className)} style="font-family: var(--font-sans);" {...rest}>
	{@render children?.()}
</div>
