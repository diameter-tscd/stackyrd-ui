<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let {
		headers,
		rows,
		children,
		class: className = "",
	} = $props<{
		headers?: string[];
		rows?: Record<string, unknown>[];
		class?: string;
		children?: Snippet<[{ row: Record<string, unknown>; header: string }]>;
	}>();

	const hasLegacyProps = $derived(!!headers && !!rows);
</script>

{#if hasLegacyProps}
	<div class={cn("relative w-full overflow-auto rounded-md border", className)}>
		<table class="w-full caption-bottom text-sm">
			<thead class="[&_tr]:border-b">
				<tr class="border-b transition-colors hover:bg-muted/50">
					{#each headers! as header}
						<th class="h-10 px-4 text-left align-middle font-medium text-muted-foreground">{header}</th>
					{/each}
				</tr>
			</thead>
			<tbody class="[&_tr:last-child]:border-0">
				{#each rows! as row}
					<tr class="border-b transition-colors hover:bg-muted/50">
						{#each headers! as header}
							<td class="p-4 align-middle">
								{#if children}
									{@render children({ row, header })}
								{:else}
									{row[header] ?? ""}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class={cn("relative w-full overflow-auto rounded-md border", className)}>
		<table class="w-full caption-bottom text-sm">
			{@render children?.()}
		</table>
	</div>
{/if}
