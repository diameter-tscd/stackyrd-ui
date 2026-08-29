<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	export const badgeVariants = tv({
		base: "inline-flex items-center rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase tracking-wide",
		variants: {
			variant: {
				default: "border-black bg-primary text-primary-foreground shadow-sm",
				secondary: "border-black bg-p5-yellow text-black",
				destructive: "border-black bg-black text-white",
				outline: "border-black bg-background text-foreground",
				success: "border-black bg-p5-green text-black",
				warning: "border-black bg-p5-yellow text-black",
				error: "border-black bg-black text-white",
				info: "border-black bg-p5-blue text-black",
				neutral: "border-black bg-muted text-foreground",
				running: "border-black bg-p5-green text-black",
				failed: "border-black bg-black text-white",
				disabled: "border-black bg-muted text-muted-foreground",
			},
		},
		defaultVariants: { variant: "default" },
	});

	export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let {
		variant = "default",
		class: className,
		children,
		...rest
	}: {
		variant?: BadgeVariant;
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<span class={cn(badgeVariants({ variant }), className)} {...rest}>
	{@render children?.()}
</span>
