<script lang="ts">
	import { invalidate } from '$app/navigation';
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { deleteRecipe } from '$lib/api/recipes';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { dragToReorder } from '$lib/utils/dragToReorder.svelte';
	import { flip } from 'svelte/animate';
	import { recipeOrder } from '$lib/state/recipeOrder.svelte';
	import type { Recipe } from '$lib/types/recipe';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let orderedRecipes = $derived(recipeOrder.apply(data.recipes));

	const drag = dragToReorder();
	function registerRecipeRef(node: HTMLElement, id: string) {
		drag.registerRef(id, node);
		return {
			destroy() {
				drag.registerRef(id, null);
			}
		};
	}

	let removingRecipe = $state<Recipe | null>(null);
	let removing = $state(false);

	async function confirmRemove() {
		if (!removingRecipe) return;
		removing = true;
		try {
			await deleteRecipe(removingRecipe._id);
			await invalidate('app:recipes');
			removingRecipe = null;
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('recipeDetail.errorDelete'));
		} finally {
			removing = false;
		}
	}
</script>

<div class="page">
	<div class="header">
		<h1>{t('recipes.title')}</h1>
		<div class="actions">
			<a class="btn-outline" href="/recipes/suggestions">{t('recipes.suggestions')}</a>
			<a class="btn-outline" href="/recipes/new">{t('recipes.newRecipe')}</a>
		</div>
	</div>

	{#if data.recipes.length === 0}
		<p class="empty">{t('recipes.empty')}</p>
	{:else}
		<div class="list">
			{#each orderedRecipes as recipe (recipe._id)}
				<div
					class="recipe-drag-row"
					class:dragging={drag.isDragging(recipe._id)}
					use:registerRecipeRef={recipe._id}
					style:transform={`translateY(${drag.offsetFor(recipe._id)}px)`}
					animate:flip={{ duration: drag.isDragging(recipe._id) ? 0 : 200 }}
				>
					<button
						type="button"
						class="drag-handle"
						aria-label={t('recipeForm.dragToReorder')}
						onpointerdown={(e) => drag.onPointerDown(e, recipe._id)}
						onpointermove={(e) =>
							drag.onPointerMove(
								e,
								recipe._id,
								orderedRecipes.map((r) => r._id),
								(from, to) => recipeOrder.reorder(orderedRecipes.map((r) => r._id), from, to)
							)}
						onpointerup={() => drag.onPointerUp(recipe._id)}
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
					<div class="card-flex">
						<RecipeCard {recipe} onDelete={(r) => (removingRecipe = r)} />
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<ConfirmModal
	open={removingRecipe !== null}
	title={t('recipeDetail.deleteTitle')}
	message={t('recipeDetail.deleteMessage', { title: removingRecipe?.title ?? '' })}
	confirmLabel={t('recipeDetail.deleteRecipe')}
	confirmingLabel={t('common.deleting')}
	cancelLabel={t('common.cancel')}
	confirming={removing}
	onConfirm={confirmRemove}
	onCancel={() => (removingRecipe = null)}
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
		gap: 0.6rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.recipe-drag-row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.recipe-drag-row.dragging {
		z-index: 10;
	}
	.card-flex {
		flex: 1;
		min-width: 0;
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
	.recipe-drag-row.dragging .drag-handle {
		cursor: grabbing;
	}
	.empty {
		color: var(--ink-soft);
		font-size: 0.9rem;
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
</style>
