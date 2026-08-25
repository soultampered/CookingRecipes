<script lang="ts">
	import { goto } from '$app/navigation';
	import { INVENTORY_CATEGORIES, type Inventory } from '$lib/types/inventory';
	import { listShoppingLists, addItem } from '$lib/api/shoppingLists';
	import type { ShoppingList } from '$lib/types/shoppingList';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { expirySettings } from '$lib/state/expirySettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let quickAddItem = $state<Inventory | null>(null);
	let shoppingLists = $state<ShoppingList[] | null>(null);
	let loadingLists = $state(false);
	let addingToListId = $state<string | null>(null);

	function selectCategory(category: string | null) {
		goto(category ? `/inventory?category=${encodeURIComponent(category)}` : '/inventory');
	}

	function isLowStock(item: Inventory) {
		return item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold;
	}

	function isExpiringSoon(item: Inventory) {
		if (!item.expirationDte) return false;
		const msAhead = expirySettings.daysAhead * 24 * 60 * 60 * 1000;
		const expiresAt = new Date(item.expirationDte).getTime();
		return expiresAt <= Date.now() + msAhead;
	}

	async function openQuickAdd(item: Inventory) {
		quickAddItem = item;
		if (!shoppingLists) {
			loadingLists = true;
			try {
				shoppingLists = await listShoppingLists();
			} catch (err) {
				toast.push(err instanceof ApiError ? err.message : 'Could not load shopping lists');
				quickAddItem = null;
			} finally {
				loadingLists = false;
			}
		}
	}

	async function quickAddToList(listId: string) {
		if (!quickAddItem) return;
		addingToListId = listId;
		try {
			await addItem(listId, { name: quickAddItem.name, quantity: 1 });
			toast.push(`Added "${quickAddItem.name}" to shopping list`, 'info');
			quickAddItem = null;
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not add item');
		} finally {
			addingToListId = null;
		}
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
				<div class="row">
					<a class="row-link" href={`/inventory/${item._id}/edit`}>
						<span class="dot" class:out={item.quantity === 0}></span>
						<span class="name">{item.name}</span>
						<span class="qty">{item.quantity} {item.unit}</span>
					</a>
					{#if isLowStock(item)}
						<button type="button" class="low-stock-badge" onclick={() => openQuickAdd(item)}>
							Low
						</button>
					{/if}
					{#if isExpiringSoon(item)}
						<span class="expiring-badge">Expiring</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if quickAddItem}
	<div
		class="backdrop"
		role="presentation"
		onclick={() => (quickAddItem = null)}
		onkeydown={(e) => e.key === 'Escape' && (quickAddItem = null)}
	>
		<div
			class="picker"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<h2>Add "{quickAddItem.name}" to a list</h2>
			{#if loadingLists}
				<p class="hint">Loading lists…</p>
			{:else if !shoppingLists || shoppingLists.length === 0}
				<p class="hint">No shopping lists yet — create one first.</p>
			{:else}
				<div class="list-options">
					{#each shoppingLists as list (list._id)}
						<button
							type="button"
							class="list-option"
							onclick={() => quickAddToList(list._id!)}
							disabled={addingToListId === list._id}
						>
							{addingToListId === list._id ? 'Adding…' : list.name}
						</button>
					{/each}
				</div>
			{/if}
			<button type="button" class="outline" onclick={() => (quickAddItem = null)}>Cancel</button>
		</div>
	</div>
{/if}

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
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		text-decoration: none;
		color: var(--ink);
		background: var(--paper-raised);
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
		border: 1px solid var(--line);
		background: var(--paper-raised);
		color: var(--ink-soft);
		white-space: nowrap;
		cursor: pointer;
	}
	.chip.active {
		background: var(--ink);
		color: var(--paper-raised);
		border-color: var(--ink);
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
		border-bottom: 1px solid var(--line);
	}
	.row-link {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex: 1;
		min-width: 0;
		text-decoration: none;
		color: inherit;
	}
	.low-stock-badge {
		flex: 0 0 auto;
		border: 1px solid var(--warn);
		background: var(--warn-soft);
		color: var(--warn);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.55rem;
		border-radius: 999px;
		cursor: pointer;
	}
	.expiring-badge {
		flex: 0 0 auto;
		border: 1px solid var(--bad);
		background: var(--bad-soft);
		color: var(--bad);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.55rem;
		border-radius: 999px;
	}
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.25rem;
		z-index: 100;
	}
	.picker {
		width: 100%;
		max-width: 340px;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.picker h2 {
		margin: 0;
		font-size: 1rem;
	}
	.list-options {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.list-option {
		text-align: left;
		padding: 0.6rem 0.7rem;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--paper);
		color: var(--ink);
		cursor: pointer;
	}
	.picker .outline {
		padding: 0.6rem;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--paper-raised);
		color: var(--ink);
		font-weight: 600;
		cursor: pointer;
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--good);
		flex: 0 0 auto;
	}
	.dot.out {
		background: var(--bad);
	}
	.name {
		flex: 1;
		min-width: 0;
		font-weight: 600;
		font-size: 0.9rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.qty {
		font-size: 0.85rem;
		color: var(--ink-soft);
		font-variant-numeric: tabular-nums;
	}
	.empty {
		color: var(--ink-soft);
		font-size: 0.9rem;
	}
</style>
