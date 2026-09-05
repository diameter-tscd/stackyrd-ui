<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	export const buttonVariants = tv({
		base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border",
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground border-black hover:bg-black hover:text-white hover:border-black shadow-sm",
				destructive: "bg-black text-white border-black hover:bg-white hover:text-black",
				outline: "bg-background text-foreground border-black hover:bg-black hover:text-white",
				secondary: "bg-p5-yellow text-black border-black hover:bg-black hover:text-white",
				ghost: "border-transparent bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-black/10",
				link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline hover:bg-transparent",
				primary: "bg-primary text-primary-foreground border-black hover:bg-black hover:text-white shadow-sm",
				danger: "bg-black text-white border-black hover:bg-white hover:text-black",
			},
			size: {
				default: "h-9 px-5 py-2",
				sm: "h-8 rounded-full px-4 text-xs",
				lg: "h-11 rounded-full px-8 text-base",
				icon: "h-9 w-9",
				md: "h-9 px-5 py-2",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import { animate } from "motion";

	let {
		variant = "default",
		size = "default",
		class: className,
		children,
		disabled = false,
		type = "button",
		href,
		...rest
	}: {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
		children?: Snippet;
		disabled?: boolean;
		type?: "button" | "submit" | "reset";
		href?: string;
		onclick?: (e: MouseEvent) => void;
		[key: string]: unknown;
	} = $props();

	function pressAnim(node: HTMLElement) {
		const onDown = () => {
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute('data-disable-anim') || disabled) return;
 // -ignore
			(animate as any)(node as any, { scale: 0.96 }, { duration: 0.1, easing: "ease-out" });
		};
		const onUp = () => {
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute('data-disable-anim') || disabled) return;
 // -ignore
			(animate as any)(node as any, { scale: 1 }, { duration: 0.2, easing: [0.34, 1.56, 0.64, 1] as unknown as string });
		};
		node.addEventListener("pointerdown", onDown);
		node.addEventListener("pointerup", onUp);
		node.addEventListener("pointerleave", onUp);
		return {
			destroy() {
				node.removeEventListener("pointerdown", onDown);
				node.removeEventListener("pointerup", onUp);
				node.removeEventListener("pointerleave", onUp);
			}
		};
	}
</script>

{#if href}
	<a href={href} class={cn(buttonVariants({ variant, size }), className)} {@attach pressAnim} {...rest}>
		{@render children?.()}
	</a>
{:else}
	<button class={cn(buttonVariants({ variant, size }), className)} {disabled} {type} {@attach pressAnim} {...rest}>
		{@render children?.()}
	</button>
{/if}
