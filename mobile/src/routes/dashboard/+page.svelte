<script lang="ts">
	import { t } from '$lib/i18n/index.svelte';
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
	<h1>{t('dashboard.title')}</h1>

	<a class="card" href="/recipes">
		<div class="card-header">
			<span class="card-title">{t('dashboard.recipes')}</span>
			<span class="stat">{data.recipes.length}</span>
		</div>
		{#if data.recipes.length === 0}
			<p class="empty">{t('dashboard.noRecipes')}</p>
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
			<span class="card-title">{t('dashboard.suggestions')}</span>
			<span class="stat">{data.suggestions.length}</span>
		</div>
		{#if data.suggestions.length === 0}
			<p class="empty">{t('dashboard.noSuggestions')}</p>
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
			<span class="card-title">{t('dashboard.inventory')}</span>
			<span class="stat">{data.inventory.length}</span>
		</div>
		{#if data.inventory.length === 0}
			<p class="empty">{t('dashboard.noInventory')}</p>
		{:else if outOfStockCount > 0}
			<p class="preview warn">
				{t(outOfStockCount === 1 ? 'dashboard.outOfStock_one' : 'dashboard.outOfStock_other', {
					count: outOfStockCount
				})}
			</p>
		{:else}
			<p class="preview good">{t('dashboard.allStocked')}</p>
		{/if}
	</a>

	<a class="card" href="/shopping-lists">
		<div class="card-header">
			<span class="card-title">{t('dashboard.shoppingLists')}</span>
			<span class="stat">{data.shoppingLists.length}</span>
		</div>
		{#if data.shoppingLists.length === 0}
			<p class="empty">{t('dashboard.noLists')}</p>
		{:else if uncheckedCount > 0}
			<p class="preview warn">
				{t(uncheckedCount === 1 ? 'dashboard.leftToGet_one' : 'dashboard.leftToGet_other', {
					count: uncheckedCount
				})}
			</p>
		{:else}
			<p class="preview good">{t('dashboard.allCaughtUp')}</p>
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
