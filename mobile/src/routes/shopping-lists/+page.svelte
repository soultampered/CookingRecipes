<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { t } from '$lib/i18n/index.svelte';
	import { swipeToDelete } from '$lib/utils/swipeToDelete.svelte';
	import { dragToReorder } from '$lib/utils/dragToReorder.svelte';
	import { flip } from 'svelte/animate';
	import { shoppingListOrder } from '$lib/state/shoppingListOrder.svelte';
	import { deleteShoppingList } from '$lib/api/shoppingLists';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function uncheckedCount(items: { checked?: boolean }[]) {
		return items.filter((i) => !i.checked).length;
	}

	let orderedLists = $derived(shoppingListOrder.apply(data.lists));

	const swipe = swipeToDelete();
	const drag = dragToReorder();
	function registerListRef(node: HTMLElement, id: string) {
		drag.registerRef(id, node);
		return {
			destroy() {
				drag.registerRef(id, null);
			}
		};
	}
	let removingListId = $state<string | null>(null);
	let removing = $state(false);

	async function confirmRemove() {
		const listId = removingListId;
		if (!listId) return;
		removing = true;
		try {
			await deleteShoppingList(listId);
			await invalidate('app:shopping-lists');
			removingListId = null;
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('shoppingList.errorDelete'));
		} finally {
			removing = false;
		}
	}
</script>

<div class="page">
	<div class="header">
		<h1>{t('shoppingLists.title')}</h1>
		<a class="btn-outline" href="/shopping-lists/new">{t('shoppingLists.newList')}</a>
	</div>

	{#if data.lists.length === 0}
		<p class="empty">{t('shoppingLists.empty')}</p>
	{:else}
		<div class="list">
			{#each orderedLists as list (list._id)}
				<div
					class="list-row"
					class:dragging={drag.isDragging(list._id!)}
					use:registerListRef={list._id!}
					style:transform={`translateY(${drag.offsetFor(list._id!)}px)`}
					animate:flip={{ duration: drag.isDragging(list._id!) ? 0 : 200 }}
				>
					<button
						type="button"
						class="drag-handle"
						aria-label={t('recipeForm.dragToReorder')}
						onpointerdown={(e) => drag.onPointerDown(e, list._id!)}
						onpointermove={(e) =>
							drag.onPointerMove(
								e,
								list._id!,
								orderedLists.map((l) => l._id!),
								(from, to) => shoppingListOrder.reorder(orderedLists.map((l) => l._id!), from, to)
							)}
						onpointerup={() => drag.onPointerUp(list._id!)}
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
								removingListId = list._id!;
								swipe.close(list._id!);
							}}
							aria-label={t('shoppingList.deleteItemAriaLabel', { name: list.name })}
						>
							{t('shoppingList.deleteAction')}
						</button>
						<a
							class="card"
							class:dragging={swipe.isDragging(list._id!)}
							href={`/shopping-lists/${list._id}`}
							style:transform={`translateX(${swipe.offsetFor(list._id!)}px)`}
							onpointerdown={(e) => swipe.onPointerDown(e, list._id!)}
							onpointermove={(e) => swipe.onPointerMove(e, list._id!)}
							onpointerup={() => swipe.onPointerUp(list._id!)}
							onpointercancel={() => swipe.onPointerUp(list._id!)}
							onclick={(e) => swipe.handleClick(e, list._id!)}
						>
							<div class="card-title">{list.name}</div>
							<div class="card-meta">
								{t(
									list.items.length === 1 ? 'shoppingLists.itemCount_one' : 'shoppingLists.itemCount_other',
									{ count: list.items.length }
								)}
								{#if uncheckedCount(list.items) > 0}
									· {t('shoppingLists.leftCount', { count: uncheckedCount(list.items) })}
								{/if}
							</div>
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<ConfirmModal
	open={removingListId !== null}
	title={t('shoppingList.deleteListTitle')}
	message={t('shoppingList.deleteListMessage', {
		name: data.lists.find((l) => l._id === removingListId)?.name ?? ''
	})}
	confirmLabel={t('shoppingList.deleteList')}
	confirmingLabel={t('common.deleting')}
	cancelLabel={t('common.cancel')}
	confirming={removing}
	onConfirm={confirmRemove}
	onCancel={() => (removingListId = null)}
/>

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
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
	.list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.list-row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.list-row.dragging {
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
	.list-row.dragging .drag-handle {
		cursor: grabbing;
	}
	.swipe-wrapper {
		position: relative;
		overflow: hidden;
		border-radius: 10px;
		flex: 1;
		min-width: 0;
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
	.card {
		position: relative;
		display: block;
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 0.8rem 0.9rem;
		text-decoration: none;
		color: inherit;
		background: var(--paper-raised);
		touch-action: pan-y;
		transition: transform 0.15s ease;
	}
	.card.dragging {
		transition: none;
	}
	.card-title {
		font-weight: 600;
	}
	.card-meta {
		font-size: 0.8rem;
		color: var(--ink-soft);
		margin-top: 0.25rem;
	}
	.empty {
		color: var(--ink-soft);
		font-size: 0.9rem;
	}
</style>
