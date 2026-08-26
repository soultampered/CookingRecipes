<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { INVENTORY_CATEGORIES, type Inventory } from '$lib/types/inventory';
	import { listShoppingLists, addItem } from '$lib/api/shoppingLists';
	import { deleteInventoryItem } from '$lib/api/inventory';
	import type { ShoppingList } from '$lib/types/shoppingList';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { expirySettings } from '$lib/state/expirySettings.svelte';
	import { t, tRaw } from '$lib/i18n/index.svelte';
	import { swipeToDelete } from '$lib/utils/swipeToDelete.svelte';
	import { dragToReorder } from '$lib/utils/dragToReorder.svelte';
	import { inventoryOrder } from '$lib/state/inventoryOrder.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import PullToRefresh from '$lib/components/PullToRefresh.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let searchQuery = $state('');
	let orderedItems = $derived.by(() => {
		const ordered = inventoryOrder.apply(data.items);
		const query = searchQuery.trim().toLowerCase();
		if (!query) return ordered;
		return ordered.filter((item) => item.name.toLowerCase().includes(query));
	});

	let quickAddItem = $state<Inventory | null>(null);
	let shoppingLists = $state<ShoppingList[] | null>(null);
	let loadingLists = $state(false);
	let addingToListId = $state<string | null>(null);
	const swipe = swipeToDelete();
	const drag = dragToReorder();
	function registerItemRef(node: HTMLElement, id: string) {
		drag.registerRef(id, node);
		return {
			destroy() {
				drag.registerRef(id, null);
			}
		};
	}
	let removingItemId = $state<string | null>(null);
	let removing = $state(false);

	async function confirmRemove() {
		const itemId = removingItemId;
		if (!itemId) return;
		removing = true;
		try {
			await deleteInventoryItem(itemId);
			await invalidate('app:inventory');
			removingItemId = null;
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('inventoryEdit.errorDelete'));
		} finally {
			removing = false;
		}
	}

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
				toast.push(err instanceof ApiError ? err.message : t('inventory.errorLoadLists'));
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
			toast.push(t('inventory.addedToList', { name: quickAddItem.name }), 'info');
			quickAddItem = null;
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('inventory.errorAddItem'));
		} finally {
			addingToListId = null;
		}
	}
</script>

<PullToRefresh dependency="app:inventory">
<div class="page">
	<div class="header">
		<h1>{t('inventory.title')}</h1>
		<a class="btn-outline" href="/inventory/new">{t('inventory.newItem')}</a>
	</div>

	<input
		type="search"
		class="search-input"
		placeholder={t('inventory.searchPlaceholder')}
		bind:value={searchQuery}
		aria-label={t('inventory.searchPlaceholder')}
	/>

	<div class="chiprow">
		<button class="chip" class:active={!data.category} onclick={() => selectCategory(null)}>
			{t('inventory.all')}
		</button>
		{#each INVENTORY_CATEGORIES as category}
			<button
				class="chip"
				class:active={data.category === category}
				onclick={() => selectCategory(category)}
			>
				{tRaw('category', category)}
			</button>
		{/each}
	</div>

	{#if data.items.length === 0}
		<EmptyState
			message={t('inventory.empty')}
			ctaLabel={t('inventory.newItem')}
			ctaHref="/inventory/new"
		/>
	{:else if orderedItems.length === 0}
		<p class="empty">{t('inventory.noSearchResults')}</p>
	{:else}
		<div class="list">
			{#each orderedItems as item (item._id)}
				<div
					class="item-drag-row"
					class:dragging={drag.isDragging(item._id)}
					use:registerItemRef={item._id}
					style:transform={`translateY(${drag.offsetFor(
						item._id,
						orderedItems.map((i) => i._id)
					)}px)`}
				>
					<button
						type="button"
						class="drag-handle"
						aria-label={t('recipeForm.dragToReorder')}
						onpointerdown={(e) =>
							drag.onPointerDown(
								e,
								item._id,
								orderedItems.map((i) => i._id)
							)}
						onpointermove={(e) =>
							drag.onPointerMove(
								e,
								item._id,
								orderedItems.map((i) => i._id)
							)}
						onpointerup={() =>
							drag.onPointerUp(item._id, (from, to) =>
								inventoryOrder.reorder(
									orderedItems.map((i) => i._id),
									from,
									to
								)
							)}
						onpointercancel={() => drag.cancel()}
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
							<circle cx="9" cy="6" r="1.8" />
							<circle cx="15" cy="6" r="1.8" />
							<circle cx="9" cy="12" r="1.8" />
							<circle cx="15" cy="12" r="1.8" />
							<circle cx="9" cy="18" r="1.8" />
							<circle cx="15" cy="18" r="1.8" />
						</svg>
					</button>
					<div class="swipe-wrapper">
						<button
							type="button"
							class="swipe-delete-action"
							onclick={() => {
								removingItemId = item._id;
								swipe.close(item._id);
							}}
							aria-label={t('shoppingList.deleteItemAriaLabel', { name: item.name })}
						>
							{t('shoppingList.deleteAction')}
						</button>
						<div
							class="row"
							class:dragging={swipe.isDragging(item._id)}
							style:transform={`translateX(${swipe.offsetFor(item._id)}px)`}
							role="group"
							aria-label={item.name}
							onpointerdown={(e) => swipe.onPointerDown(e, item._id)}
							onpointermove={(e) => swipe.onPointerMove(e, item._id)}
							onpointerup={() => swipe.onPointerUp(item._id)}
							onpointercancel={() => swipe.onPointerUp(item._id)}
						>
							<a
								class="row-link"
								href={`/inventory/${item._id}/edit`}
								onclick={(e) => swipe.handleClick(e, item._id)}
							>
								<span class="dot" class:out={item.quantity === 0}></span>
								<span class="name">{item.name}</span>
								<span class="qty">{item.quantity} {tRaw('unit', item.unit)}</span>
							</a>
							{#if isLowStock(item)}
								<button type="button" class="low-stock-badge" onclick={() => openQuickAdd(item)}>
									{t('inventory.lowBadge')}
								</button>
							{/if}
							{#if isExpiringSoon(item)}
								<span class="expiring-badge">{t('inventory.expiringBadge')}</span>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
</PullToRefresh>

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
			<h2>{t('inventory.addToListTitle', { name: quickAddItem.name })}</h2>
			{#if loadingLists}
				<p class="hint">{t('inventory.loadingLists')}</p>
			{:else if !shoppingLists || shoppingLists.length === 0}
				<p class="hint">{t('inventory.noLists')}</p>
			{:else}
				<div class="list-options">
					{#each shoppingLists as list (list._id)}
						<button
							type="button"
							class="list-option"
							onclick={() => quickAddToList(list._id!)}
							disabled={addingToListId === list._id}
						>
							{addingToListId === list._id ? t('common.adding') : list.name}
						</button>
					{/each}
				</div>
			{/if}
			<button type="button" class="outline" onclick={() => (quickAddItem = null)}>
				{t('common.cancel')}
			</button>
		</div>
	</div>
{/if}

<ConfirmModal
	open={removingItemId !== null}
	title={t('inventoryEdit.deleteTitle')}
	message={t('inventoryEdit.deleteMessage', {
		name: data.items.find((i) => i._id === removingItemId)?.name ?? ''
	})}
	confirmLabel={t('inventoryEdit.deleteItem')}
	confirmingLabel={t('common.deleting')}
	cancelLabel={t('common.cancel')}
	confirming={removing}
	onConfirm={confirmRemove}
	onCancel={() => (removingItemId = null)}
/>

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
	.search-input {
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 0.9rem;
		background: var(--paper-raised);
		color: var(--ink);
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
	.item-drag-row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		transition: transform 0.2s ease;
	}
	.item-drag-row.dragging {
		z-index: 10;
		transition: none;
	}
	.drag-handle {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.2rem;
		height: 2.2rem;
		border: none;
		background: none;
		color: var(--ink-soft);
		cursor: grab;
		touch-action: none;
	}
	.item-drag-row.dragging .drag-handle {
		cursor: grabbing;
	}
	.swipe-wrapper {
		flex: 1;
		min-width: 0;
		position: relative;
		overflow: hidden;
	}
	.swipe-delete-action {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 76px;
		border: none;
		background: var(--bad);
		color: var(--paper-raised);
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--line);
		background: var(--paper);
		touch-action: pan-y;
		transition: transform 0.15s ease;
	}
	.row.dragging {
		transition: none;
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
