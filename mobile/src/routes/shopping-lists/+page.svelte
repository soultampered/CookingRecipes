<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { t } from '$lib/i18n/index.svelte';
	import { swipeToDelete } from '$lib/utils/swipeToDelete.svelte';
	import { dragToReorder } from '$lib/utils/dragToReorder.svelte';
	import { shoppingListOrder } from '$lib/state/shoppingListOrder.svelte';
	import { deleteShoppingList, createShoppingList, addItem } from '$lib/api/shoppingLists';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import PullToRefresh from '$lib/components/PullToRefresh.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { shoppingListTemplates } from '$lib/state/shoppingListTemplates.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let showTemplatePicker = $state(false);
	let creatingFromTemplateId = $state<string | null>(null);

	async function createFromTemplate(templateId: string) {
		const template = shoppingListTemplates.current.find((t) => t.id === templateId);
		if (!template) return;
		creatingFromTemplateId = templateId;
		try {
			const list = await createShoppingList({ name: template.name, items: [] });
			await Promise.all(template.items.map((item) => addItem(list._id!, item)));
			await invalidate('app:shopping-lists');
			showTemplatePicker = false;
			await goto(`/shopping-lists/${list._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('shoppingListNew.error'));
		} finally {
			creatingFromTemplateId = null;
		}
	}

	async function deleteTemplate(templateId: string) {
		await shoppingListTemplates.remove(templateId);
	}

	function uncheckedCount(items: { checked?: boolean }[]) {
		return items.filter((i) => !i.checked).length;
	}

	let orderedLists = $derived(shoppingListOrder.apply(data.lists));

	// STO-74: the home-screen widget deep-links here with ?quickAdd=1 — jump straight into
	// whichever list is first in the user's own ordering (same "active list" concept the
	// widget has no way to know about itself, since it has no data/auth access of its own)
	// and land on its add-item input already focused.
	$effect(() => {
		if (page.url.searchParams.get('quickAdd') === '1' && orderedLists.length > 0) {
			goto(`/shopping-lists/${orderedLists[0]._id}?focus=1`, { replaceState: true });
		}
	});

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

<PullToRefresh dependency="app:shopping-lists">
<div class="page">
	<div class="header">
		<h1>{t('shoppingLists.title')}</h1>
		<div class="header-actions">
			{#if shoppingListTemplates.current.length > 0}
				<button
					type="button"
					class="btn-outline"
					onclick={() => (showTemplatePicker = true)}
				>
					{t('shoppingLists.fromTemplate')}
				</button>
			{/if}
			<a class="btn-outline" href="/shopping-lists/new">{t('shoppingLists.newList')}</a>
		</div>
	</div>

	{#if data.lists.length === 0}
		<EmptyState
			message={t('shoppingLists.empty')}
			ctaLabel={t('shoppingLists.newList')}
			ctaHref="/shopping-lists/new"
		/>
	{:else}
		<div class="list">
			{#each orderedLists as list (list._id)}
				<div
					class="list-row"
					class:dragging={drag.isDragging(list._id!)}
					use:registerListRef={list._id!}
					style:transform={`translateY(${drag.offsetFor(
						list._id!,
						orderedLists.map((l) => l._id!)
					)}px)`}
				>
					<button
						type="button"
						class="drag-handle"
						aria-label={t('recipeForm.dragToReorder')}
						onpointerdown={(e) =>
							drag.onPointerDown(
								e,
								list._id!,
								orderedLists.map((l) => l._id!)
							)}
						onpointermove={(e) =>
							drag.onPointerMove(
								e,
								list._id!,
								orderedLists.map((l) => l._id!)
							)}
						onpointerup={() =>
							drag.onPointerUp(list._id!, (from, to) =>
								shoppingListOrder.reorder(
									orderedLists.map((l) => l._id!),
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
</PullToRefresh>

{#if showTemplatePicker}
	<div
		class="backdrop"
		role="presentation"
		onclick={() => (showTemplatePicker = false)}
		onkeydown={(e) => e.key === 'Escape' && (showTemplatePicker = false)}
	>
		<div
			class="picker"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h2>{t('shoppingLists.fromTemplateTitle')}</h2>
			<div class="list-options">
				{#each shoppingListTemplates.current as template (template.id)}
					<div class="template-row">
						<button
							type="button"
							class="list-option"
							onclick={() => createFromTemplate(template.id)}
							disabled={creatingFromTemplateId === template.id}
						>
							{creatingFromTemplateId === template.id
								? t('common.adding')
								: t('shoppingLists.templateItemCount', {
										name: template.name,
										count: template.items.length
									})}
						</button>
						<button
							type="button"
							class="template-remove"
							onclick={() => deleteTemplate(template.id)}
							aria-label={t('shoppingLists.deleteTemplateAriaLabel', { name: template.name })}
						>
							×
						</button>
					</div>
				{/each}
			</div>
			<button type="button" class="outline" onclick={() => (showTemplatePicker = false)}>
				{t('common.cancel')}
			</button>
		</div>
	</div>
{/if}

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
		gap: 0.5rem;
	}
	.header-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.btn-outline {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		font-family: inherit;
		text-decoration: none;
		color: var(--ink);
		background: var(--paper-raised);
		cursor: pointer;
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
	.template-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.list-option {
		flex: 1;
		min-width: 0;
		text-align: left;
		padding: 0.6rem 0.7rem;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--paper);
		color: var(--ink);
		cursor: pointer;
	}
	.template-remove {
		flex: 0 0 auto;
		border: none;
		background: none;
		color: var(--bad);
		font-size: 1.1rem;
		cursor: pointer;
		padding: 0 0.3rem;
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
		transition: transform 0.2s ease;
	}
	.list-row.dragging {
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
</style>
