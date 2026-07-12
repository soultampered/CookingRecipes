<script lang="ts">
	import { goto } from '$app/navigation';
	import { INVENTORY_CATEGORIES } from '$lib/types/inventory';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function selectCategory(category: string | null) {
		goto(category ? `/inventory?category=${encodeURIComponent(category)}` : '/inventory');
	}
</script>

<div class="page">
	<div class="header">
		<h1>Inventory</h1>
		<a class="btn-outline" href="/inventory/new">+ New item</a>
	</div>

	<div class="chiprow">
		<button class="chip" class:active={!data.category} onclick={() => selectCategory(null)}>All</button>
		{#each INVENTORY_CATEGORIES as category}
			<button
				class="chip"
				class:active={data.category === category}
				onclick={() => selectCategory(category)}
			>
				{category}
			</button>
		{/each}
	</div>

	{#if data.items.length === 0}
		<p class="empty">No items in this category yet.</p>
	{:else}
		<div class="list">
			{#each data.items as item (item._id)}
				<a class="row" href={`/inventory/${item._id}/edit`}>
					<span class="dot" class:out={item.quantity === 0}></span>
					<span class="name">{item.name}</span>
					<span class="qty">{item.quantity} {item.unit}</span>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.btn-outline {
		border: 1px solid #ccc;
		border-radius: 8px;
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		text-decoration: none;
		color: inherit;
	}
	.chiprow {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		padding-bottom: 0.2rem;
	}
	.chip {
		flex: 0 0 auto;
		font-size: 0.78rem;
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		border: 1px solid #ccc;
		background: none;
		color: #666;
		white-space: nowrap;
		cursor: pointer;
	}
	.chip.active {
		background: #1e1c19;
		color: white;
		border-color: #1e1c19;
	}
	.list {
		display: flex;
		flex-direction: column;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0;
		border-bottom: 1px solid #eee;
		text-decoration: none;
		color: inherit;
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #4c6b3f;
		flex: 0 0 auto;
	}
	.dot.out {
		background: #a23629;
	}
	.name {
		flex: 1;
		font-weight: 600;
		font-size: 0.9rem;
	}
	.qty {
		font-size: 0.85rem;
		color: #666;
		font-variant-numeric: tabular-nums;
	}
	.empty {
		color: #666;
		font-size: 0.9rem;
	}
</style>
