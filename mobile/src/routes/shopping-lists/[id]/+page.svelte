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
	import QuantityStepper from '$lib/components/QuantityStepper.svelte';
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
	const itemDrag = dragToReorder();

	let selectMode = $state(false);
	let selectedIds = $state<Set<string>>(new Set());
	let bulkActing = $state(false);
	let confirmingBulkDelete = $state(false);

	function toggleSelectMode() {
		selectMode = !selectMode;
		selectedIds = new Set();
	}

	function toggleSelected(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}

	// Selection is a client-only mode overlay, not a gesture — drag/swipe stay wired up but
	// only actually engage when selectMode is off, so the two interactions never fight.
	function rowPointerDown(e: PointerEvent, id: string) {
		if (!selectMode) itemSwipe.onPointerDown(e, id);
	}
	function rowPointerMove(e: PointerEvent, id: string) {
		if (!selectMode) itemSwipe.onPointerMove(e, id);
	}
	function rowPointerUp(id: string) {
		if (!selectMode) itemSwipe.onPointerUp(id);
	}

	async function bulkMarkChecked() {
		// toggleItemChecked flips server-side state with no body, so only touch items that are
		// currently unchecked — otherwise an already-checked item selected alongside unchecked
		// ones would get flipped back off instead of staying checked.
		const ids = [...selectedIds].filter((id) => !data.list.items.find((i) => i._id === id)?.checked);
		if (ids.length === 0) {
			toggleSelectMode();
			return;
		}
		bulkActing = true;
		try {
			await Promise.all(ids.map((id) => toggleItemChecked(data.list._id!, id)));
			await invalidate(`app:shopping-list:${data.list._id}`);
			toggleSelectMode();
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('shoppingList.errorUpdateItem'));
		} finally {
			bulkActing = false;
		}
	}

	async function confirmBulkDelete() {
		bulkActing = true;
		try {
			await Promise.all([...selectedIds].map((id) => removeItem(data.list._id!, id)));
			await invalidate(`app:shopping-list:${data.list._id}`);
			confirmingBulkDelete = false;
			toggleSelectMode();
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('shoppingList.errorRemoveItem'));
		} finally {
			bulkActing = false;
		}
	}

	// Item order is real server data (not a client-only preference like categoryOrder/
	// shoppingListOrder), so a drag needs to end in a single PATCH. dragToReorder never
	// touches the backing array during the drag itself (only visual per-row offsets, resolved
	// once on release), so there's exactly one reorder call — and therefore exactly one PATCH
	// — per drag gesture, not one per sibling crossed.
	async function reorderItemsInCategory(category: string, fromIndex: number, toIndex: number) {
		const group = data.list.items.filter((i) => (i.category ?? '') === category);
		const copy = [...group];
		const [moved] = copy.splice(fromIndex, 1);
		copy.splice(toIndex, 0, moved);
		let cursor = 0;
		const reordered = data.list.items.map((i) =>
			(i.category ?? '') === category ? copy[cursor++] : i
		);
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

	let quickAdding = $state<string | null>(null);

	async function handleQuickAdd(name: string) {
		quickAdding = name;
		try {
			await addItem(data.list._id!, { name, quantity: 1 });
			await invalidate(`app:shopping-list:${data.list._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('shoppingList.errorAddItem'));
		} finally {
			quickAdding = null;
		}
	}

	// User's own aisle-order preference first (see STO-26), uncategorized items last.
	let groupedItems = $derived.by(() => {
		const groups = new Map<string, ShoppingListItem[]>();
		for (const item of data.list.items) {
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
		<div class="select-toolbar">
			{#if selectMode}
				<span class="select-count">{t('shoppingList.selectedCount', { count: selectedIds.size })}</span>
				<div class="select-actions">
					<button
						type="button"
						class="select-action"
						disabled={selectedIds.size === 0 || bulkActing}
						onclick={bulkMarkChecked}
					>
						{t('shoppingList.checkSelected')}
					</button>
					<button
						type="button"
						class="select-action danger"
						disabled={selectedIds.size === 0 || bulkActing}
						onclick={() => (confirmingBulkDelete = true)}
					>
						{t('shoppingList.deleteSelected')}
					</button>
					<button type="button" class="select-action outline" onclick={toggleSelectMode}>
						{t('common.cancel')}
					</button>
				</div>
			{:else}
				<button type="button" class="select-action outline" onclick={toggleSelectMode}>
					{t('shoppingList.selectItems')}
				</button>
			{/if}
		</div>
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
						style:transform={`translateY(${itemDrag.offsetFor(
							item._id!,
							items.map((i) => i._id!)
						)}px)`}
					>
						{#if selectMode}
							<input
								type="checkbox"
								class="select-checkbox"
								checked={selectedIds.has(item._id!)}
								onchange={() => toggleSelected(item._id!)}
								aria-label={t('shoppingList.selectItemAriaLabel', { name: item.name })}
							/>
						{:else}
							<button
								type="button"
								class="drag-handle"
								aria-label={t('recipeForm.dragToReorder')}
								onpointerdown={(e) =>
									itemDrag.onPointerDown(
										e,
										item._id!,
										items.map((i) => i._id!)
									)}
								onpointermove={(e) =>
									itemDrag.onPointerMove(
										e,
										item._id!,
										items.map((i) => i._id!)
									)}
								onpointerup={() =>
									itemDrag.onPointerUp(item._id!, (from, to) =>
										reorderItemsInCategory(category, from, to)
									)}
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
						{/if}
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
								onpointerdown={(e) => rowPointerDown(e, item._id!)}
								onpointermove={(e) => rowPointerMove(e, item._id!)}
								onpointerup={() => rowPointerUp(item._id!)}
								onpointercancel={() => rowPointerUp(item._id!)}
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

	{#if data.recentNames.length > 0}
		<div class="quick-add-chips">
			{#each data.recentNames as name (name)}
				<button
					type="button"
					class="chip"
					disabled={quickAdding !== null}
					onclick={() => handleQuickAdd(name)}
				>
					{quickAdding === name ? t('common.adding') : `+ ${name}`}
				</button>
			{/each}
		</div>
	{/if}

	<form class="add-item-form" onsubmit={handleAddItem}>
		<input type="text" placeholder={t('shoppingList.itemNamePlaceholder')} bind:value={itemName} required />
		<QuantityStepper
			bind:value={itemQuantity}
			min={1}
			decreaseLabel={t('shoppingList.decreaseQuantity')}
			increaseLabel={t('shoppingList.increaseQuantity')}
			quantityLabel={t('shoppingList.quantityAriaLabel')}
		/>
		<button type="submit" disabled={adding}>{adding ? t('common.adding') : t('shoppingList.add')}</button>
	</form>

	<div class="danger-zone">
		<button type="button" class="danger-link" onclick={() => (confirmingDeleteList = true)}>
			{t('shoppingList.deleteList')}
		</button>
	</div>
</div>

<ConfirmModal
	open={confirmingBulkDelete}
	title={t('shoppingList.removeSelectedTitle')}
	message={t('shoppingList.removeSelectedMessage', { count: selectedIds.size })}
	confirmLabel={t('shoppingList.remove')}
	confirmingLabel={t('shoppingList.removing')}
	cancelLabel={t('common.cancel')}
	confirming={bulkActing}
	onConfirm={confirmBulkDelete}
	onCancel={() => (confirmingBulkDelete = false)}
/>

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
	.select-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.select-count {
		font-size: 0.8rem;
		color: var(--ink-soft);
	}
	.select-actions {
		display: flex;
		gap: 0.5rem;
	}
	.select-action {
		font-size: 0.8rem;
		padding: 0.4rem 0.7rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
		cursor: pointer;
	}
	.select-action:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.select-action.danger {
		background: var(--bad);
	}
	.select-action.outline {
		border: 1px solid var(--line);
		background: var(--paper-raised);
		color: var(--ink);
	}
	.select-checkbox {
		flex: 0 0 auto;
		width: 2.2rem;
		height: 2.2rem;
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
	.quick-add-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.4rem;
	}
	.chip {
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 0.35rem 0.75rem;
		font-size: 0.8rem;
		background: var(--paper-raised);
		color: var(--ink);
		cursor: pointer;
	}
	.chip:disabled {
		opacity: 0.6;
		cursor: default;
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
	.add-item-form :global(.stepper) {
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
