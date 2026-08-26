<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import {
		addItem,
		deleteShoppingList,
		removeItem,
		toggleItemChecked,
		updateShoppingList
	} from '$lib/api/shoppingLists';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { categoryOrder } from '$lib/state/categoryOrder.svelte';
	import { t, tRaw } from '$lib/i18n/index.svelte';
	import { swipeToDelete } from '$lib/utils/swipeToDelete.svelte';
	import { dragToReorder } from '$lib/utils/dragToReorder.svelte';
	import { flip } from 'svelte/animate';
	import type { ShoppingListItem } from '$lib/types/shoppingList';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let itemName = $state('');
	let itemQuantity = $state(1);
	let adding = $state(false);
	let deleting = $state(false);
	let removingItemId = $state<string | null>(null);
	let confirmingDeleteList = $state(false);
	const itemSwipe = swipeToDelete();

	// Item order is real server data (not a client-only preference like categoryOrder/
	// shoppingListOrder), so a drag has to end in a PATCH — but persisting on every pointermove
	// during a live drag would spam the API once per sibling crossed. draftItems holds the
	// live-reordered full item list locally while a drag is in progress (null = "just use
	// data.list.items"); the actual PATCH only fires once, on release.
	let draftItems = $state<ShoppingListItem[] | null>(null);
	let displayItems = $derived(draftItems ?? data.list.items);
	const itemDrag = dragToReorder();

	function reorderItemsInCategory(category: string, fromIndex: number, toIndex: number) {
		const base = draftItems ?? data.list.items;
		const group = base.filter((i) => (i.category ?? '') === category);
		const copy = [...group];
		const [moved] = copy.splice(fromIndex, 1);
		copy.splice(toIndex, 0, moved);
		let cursor = 0;
		draftItems = base.map((i) => ((i.category ?? '') === category ? copy[cursor++] : i));
	}

	async function commitItemOrder() {
		if (!draftItems) return;
		const reordered = draftItems;
		draftItems = null;
		try {
			await updateShoppingList(data.list._id!, { items: reordered });
			await invalidate(`app:shopping-list:${data.list._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('shoppingList.errorUpdateItem'));
		}
	}

	let editingName = $state(false);
	let nameDraft = $state(data.list.name);
	let savingName = $state(false);

	async function handleAddItem(event: SubmitEvent) {
		event.preventDefault();
		adding = true;
		try {
			// Category is derived server-side from the item name — see STO-18.
			await addItem(data.list._id!, { name: itemName, quantity: itemQuantity });
			itemName = '';
			itemQuantity = 1;
			await invalidate(`app:shopping-list:${data.list._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('shoppingList.errorAddItem'));
		} finally {
			adding = false;
		}
	}

	// User's own aisle-order preference first (see STO-26), uncategorized items last.
	let groupedItems = $derived.by(() => {
		const groups = new Map<string, ShoppingListItem[]>();
		for (const item of displayItems) {
			const key = item.category ?? '';
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(item);
		}
		const ordered: [string, ShoppingListItem[]][] = [];
		for (const category of categoryOrder.current) {
			if (groups.has(category)) ordered.push([category, groups.get(category)!]);
		}
		if (groups.has('')) ordered.push(['', groups.get('')!]);
		return ordered;
	});

	async function handleToggle(itemId: string) {
		try {
			await toggleItemChecked(data.list._id!, itemId);
			await invalidate(`app:shopping-list:${data.list._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('shoppingList.errorUpdateItem'));
		}
	}

	async function confirmRemove() {
		const itemId = removingItemId;
		if (!itemId) return;
		try {
			await removeItem(data.list._id!, itemId);
			await invalidate(`app:shopping-list:${data.list._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('shoppingList.errorRemoveItem'));
		} finally {
			removingItemId = null;
		}
	}

	function focusOnMount(node: HTMLInputElement) {
		node.focus();
	}

	function registerItemDragRef(node: HTMLElement, id: string) {
		itemDrag.registerRef(id, node);
		return {
			destroy() {
				itemDrag.registerRef(id, null);
			}
		};
	}

	function startEditName() {
		nameDraft = data.list.name;
		editingName = true;
	}

	async function saveName() {
		const trimmed = nameDraft.trim();
		if (!trimmed || trimmed === data.list.name) {
			editingName = false;
			return;
		}
		savingName = true;
		try {
			await updateShoppingList(data.list._id!, { name: trimmed });
			await invalidate(`app:shopping-list:${data.list._id}`);
			editingName = false;
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('shoppingList.errorRename'));
		} finally {
			savingName = false;
		}
	}

	async function confirmDeleteList() {
		deleting = true;
		try {
			await deleteShoppingList(data.list._id!);
			await goto('/shopping-lists');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('shoppingList.errorDelete'));
			deleting = false;
			confirmingDeleteList = false;
		}
	}
</script>

<div class="page">
	<a class="back" href="/shopping-lists">{t('shoppingList.back')}</a>

	{#if editingName}
		<form
			class="rename-form"
			onsubmit={(e) => {
				e.preventDefault();
				saveName();
			}}
		>
			<input type="text" bind:value={nameDraft} maxlength="100" required use:focusOnMount />
			<button type="submit" disabled={savingName}>
				{savingName ? t('common.saving') : t('common.save')}
			</button>
			<button
				type="button"
				class="outline"
				onclick={() => (editingName = false)}
				disabled={savingName}
			>
				{t('common.cancel')}
			</button>
		</form>
	{:else}
		<div class="title-row">
			<h1>{data.list.name}</h1>
			<button
				type="button"
				class="edit-btn"
				onclick={startEditName}
				aria-label={t('shoppingList.renameAriaLabel')}
			>
				✎
			</button>
		</div>
	{/if}

	{#if data.list.items.length === 0}
		<p class="empty">{t('shoppingList.empty')}</p>
	{:else}
		{#each groupedItems as [category, items] (category || '__uncategorized')}
			{#if groupedItems.length > 1}
				<div class="category-header">{category ? tRaw('category', category) : t('common.other')}</div>
			{/if}
			<div class="items">
				{#each items as item (item._id)}
					<div
						class="item-drag-row"
						class:dragging={itemDrag.isDragging(item._id!)}
						use:registerItemDragRef={item._id!}
						style:transform={`translateY(${itemDrag.offsetFor(item._id!)}px)`}
						animate:flip={{ duration: itemDrag.isDragging(item._id!) ? 0 : 200 }}
					>
						<button
							type="button"
							class="drag-handle"
							aria-label={t('recipeForm.dragToReorder')}
							onpointerdown={(e) => itemDrag.onPointerDown(e, item._id!)}
							onpointermove={(e) =>
								itemDrag.onPointerMove(
									e,
									item._id!,
									items.map((i) => i._id!),
									(from, to) => reorderItemsInCategory(category, from, to)
								)}
							onpointerup={() => {
								itemDrag.onPointerUp(item._id!);
								commitItemOrder();
							}}
							onpointercancel={() => itemDrag.cancel()}
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
									removingItemId = item._id!;
									itemSwipe.close(item._id!);
								}}
								aria-label={t('shoppingList.deleteItemAriaLabel', { name: item.name })}
							>
								{t('shoppingList.deleteAction')}
							</button>
							<div
								class="item-row"
								class:dragging={itemSwipe.isDragging(item._id!)}
								style:transform={`translateX(${itemSwipe.offsetFor(item._id!)}px)`}
								role="group"
								aria-label={item.name}
								onpointerdown={(e) => itemSwipe.onPointerDown(e, item._id!)}
								onpointermove={(e) => itemSwipe.onPointerMove(e, item._id!)}
								onpointerup={() => itemSwipe.onPointerUp(item._id!)}
								onpointercancel={() => itemSwipe.onPointerUp(item._id!)}
							>
								<input
									type="checkbox"
									checked={item.checked}
									onchange={() => handleToggle(item._id!)}
								/>
								<span class="item-name" class:checked={item.checked}>{item.name}</span>
								<span class="item-qty">{item.quantity}</span>
								<button type="button" class="remove" onclick={() => (removingItemId = item._id!)}>×</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/each}
	{/if}

	<form class="add-item-form" onsubmit={handleAddItem}>
		<input type="text" placeholder={t('shoppingList.itemNamePlaceholder')} bind:value={itemName} required />
		<input type="number" min="1" bind:value={itemQuantity} />
		<button type="submit" disabled={adding}>{adding ? t('common.adding') : t('shoppingList.add')}</button>
	</form>

	<div class="danger-zone">
		<button type="button" class="danger-link" onclick={() => (confirmingDeleteList = true)}>
			{t('shoppingList.deleteList')}
		</button>
	</div>
</div>

<ConfirmModal
	open={removingItemId !== null}
	title={t('shoppingList.removeItemTitle')}
	message={t('shoppingList.removeItemMessage', {
		name: data.list.items.find((i) => i._id === removingItemId)?.name ?? ''
	})}
	confirmLabel={t('shoppingList.remove')}
	confirmingLabel={t('shoppingList.removing')}
	cancelLabel={t('common.cancel')}
	onConfirm={confirmRemove}
	onCancel={() => (removingItemId = null)}
/>

<ConfirmModal
	open={confirmingDeleteList}
	title={t('shoppingList.deleteListTitle')}
	message={t('shoppingList.deleteListMessage', { name: data.list.name })}
	confirmLabel={t('shoppingList.deleteList')}
	confirmingLabel={t('common.deleting')}
	cancelLabel={t('common.cancel')}
	confirming={deleting}
	onConfirm={confirmDeleteList}
	onCancel={() => (confirmingDeleteList = false)}
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
	.back {
		align-self: flex-start;
		font-size: 0.85rem;
		color: var(--accent);
		text-decoration: none;
	}
	.title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.title-row h1 {
		margin: 0;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.edit-btn {
		border: none;
		background: none;
		color: var(--ink-soft);
		font-size: 1rem;
		cursor: pointer;
		flex: 0 0 auto;
		padding: 0.2rem 0.3rem;
	}
	.rename-form {
		display: flex;
		gap: 0.5rem;
	}
	.rename-form input {
		flex: 1;
		min-width: 0;
	}
	.rename-form button {
		flex: 0 0 auto;
		padding: 0.55rem 0.75rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.rename-form button.outline {
		border: 1px solid var(--line);
		background: var(--paper-raised);
		color: var(--ink);
	}
	.category-header {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
		margin-top: 0.6rem;
	}
	.category-header:first-of-type {
		margin-top: 0;
	}
	.items {
		display: flex;
		flex-direction: column;
	}
	.item-drag-row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.item-drag-row.dragging {
		z-index: 10;
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
	.item-row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--line);
		background: var(--paper);
		touch-action: pan-y;
		transition: transform 0.15s ease;
	}
	.item-row.dragging {
		transition: none;
	}
	.item-name {
		flex: 1;
		min-width: 0;
		font-size: 0.9rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.item-name.checked {
		color: var(--ink-soft);
		text-decoration: line-through;
	}
	.item-qty {
		font-size: 0.85rem;
		color: var(--ink-soft);
		font-variant-numeric: tabular-nums;
	}
	.remove {
		border: none;
		background: none;
		color: var(--bad);
		font-size: 1.1rem;
		cursor: pointer;
		flex: 0 0 auto;
		padding: 0 0.3rem;
	}
	.empty {
		color: var(--ink-soft);
		font-size: 0.9rem;
	}
	.add-item-form {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.4rem;
	}
	.add-item-form input[type='text'] {
		flex: 2;
		min-width: 0;
	}
	.add-item-form input[type='number'] {
		flex: 1;
		min-width: 0;
	}
	input {
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 1rem;
		background: var(--paper-raised);
		color: var(--ink);
	}
	.add-item-form button {
		padding: 0.55rem 0.9rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
		cursor: pointer;
		flex: 0 0 auto;
	}
	.danger-zone {
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--line);
		display: flex;
	}
	.danger-link {
		border: none;
		background: none;
		color: var(--bad);
		font-size: 0.85rem;
		text-decoration: underline;
		cursor: pointer;
		padding: 0;
	}
</style>
