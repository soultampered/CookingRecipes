<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let outOfStockCount = $derived(data.inventory.filter((i) => i.quantity === 0).length);
	let uncheckedCount = $derived(
		data.shoppingLists.reduce(
			(total, list) => total + list.items.filter((i) => !i.checked).length,
			0
		)
	);
</script>

<div class="page">
	<h1>Dashboard</h1>

	<a class="card" href="/recipes">
		<div class="card-header">
			<span class="card-title">Recipes</span>
			<span class="stat">{data.recipes.length}</span>
		</div>
		{#if data.recipes.length === 0}
			<p class="empty">No recipes yet.</p>
		{:else}
			<p class="preview">
				{data.recipes
					.slice(0, 3)
					.map((r) => r.title)
					.join(' · ')}
			</p>
		{/if}
	</a>

	<a class="card" href="/recipes/suggestions">
		<div class="card-header">
			<span class="card-title">Suggestions</span>
			<span class="stat">{data.suggestions.length}</span>
		</div>
		{#if data.suggestions.length === 0}
			<p class="empty">Nothing fully stocked yet.</p>
		{:else}
			<p class="preview">
				{data.suggestions
					.slice(0, 3)
					.map((r) => r.title)
					.join(' · ')}
			</p>
		{/if}
	</a>

	<a class="card" href="/inventory">
		<div class="card-header">
			<span class="card-title">Inventory</span>
			<span class="stat">{data.inventory.length}</span>
		</div>
		{#if data.inventory.length === 0}
			<p class="empty">No items yet.</p>
		{:else if outOfStockCount > 0}
			<p class="preview warn">{outOfStockCount} item{outOfStockCount > 1 ? 's' : ''} out of stock</p>
		{:else}
			<p class="preview good">Everything's stocked.</p>
		{/if}
	</a>

	<a class="card" href="/shopping-lists">
		<div class="card-header">
			<span class="card-title">Shopping Lists</span>
			<span class="stat">{data.shoppingLists.length}</span>
		</div>
		{#if data.shoppingLists.length === 0}
			<p class="empty">No lists yet.</p>
		{:else if uncheckedCount > 0}
			<p class="preview warn">{uncheckedCount} item{uncheckedCount > 1 ? 's' : ''} left to get</p>
		{:else}
			<p class="preview good">All caught up.</p>
		{/if}
	</a>
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
	.card {
		display: block;
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1rem 1.1rem;
		text-decoration: none;
		color: inherit;
		background: var(--paper-raised);
	}
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.card-title {
		font-weight: 600;
		font-size: 1rem;
	}
	.stat {
		font-size: 1.4rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--accent);
	}
	.preview,
	.empty {
		margin: 0.4rem 0 0;
		font-size: 0.85rem;
		color: var(--ink-soft);
	}
	.preview.warn {
		color: var(--bad);
	}
	.preview.good {
		color: var(--good);
	}
</style>
