<script lang="ts">
	import { invalidate } from '$app/navigation';
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { deleteRecipe } from '$lib/api/recipes';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { dragToReorder } from '$lib/utils/dragToReorder.svelte';
	import { swipeToDelete } from '$lib/utils/swipeToDelete.svelte';
	import { recipeOrder } from '$lib/state/recipeOrder.svelte';
	import { recipeViewMode } from '$lib/state/recipeViewMode.svelte';
	import PullToRefresh from '$lib/components/PullToRefresh.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { Recipe } from '$lib/types/recipe';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let searchQuery = $state('');
	let activeTag = $state<string | null>(null);

	let allTags = $derived.by(() => {
		const tags = new Set<string>();
		for (const recipe of data.recipes) {
			for (const tag of recipe.tags ?? []) tags.add(tag);
		}
		return [...tags].sort((a, b) => a.localeCompare(b));
	});

	let orderedRecipes = $derived.by(() => {
		let ordered = recipeOrder.apply(data.recipes);
		if (activeTag) {
			ordered = ordered.filter((recipe) => recipe.tags?.includes(activeTag!));
		}
		const query = searchQuery.trim().toLowerCase();
		if (!query) return ordered;
		return ordered.filter(
			(recipe) =>
				recipe.title.toLowerCase().includes(query) ||
				(recipe.description ?? '').toLowerCase().includes(query)
		);
	});

	const drag = dragToReorder();
	const swipe = swipeToDelete();
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

<PullToRefresh dependency="app:recipes">
<div class="page">
	<div class="header">
		<h1>{t('recipes.title')}</h1>
		<div class="actions">
			<button
				type="button"
				class="btn-outline"
				onclick={() => recipeViewMode.set(recipeViewMode.current === 'list' ? 'grid' : 'list')}
				aria-label={t(
					recipeViewMode.current === 'list' ? 'recipes.gridViewAriaLabel' : 'recipes.listViewAriaLabel'
				)}
			>
				{recipeViewMode.current === 'list' ? t('recipes.gridView') : t('recipes.listView')}
			</button>
			<a class="btn-outline" href="/recipes/suggestions">{t('recipes.suggestions')}</a>
			<a class="btn-outline" href="/recipes/new">{t('recipes.newRecipe')}</a>
		</div>
	</div>

	<input
		type="search"
		class="search-input"
		placeholder={t('recipes.searchPlaceholder')}
		bind:value={searchQuery}
		aria-label={t('recipes.searchPlaceholder')}
	/>

	{#if allTags.length > 0}
		<div class="tag-chiprow">
			{#each allTags as tag}
				<button
					type="button"
					class="tag-chip-filter"
					class:active={activeTag === tag}
					onclick={() => (activeTag = activeTag === tag ? null : tag)}
				>
					{tag}
				</button>
			{/each}
		</div>
	{/if}

	{#if data.recipes.length === 0}
		<EmptyState
			message={t('recipes.empty')}
			ctaLabel={t('recipes.newRecipe')}
			ctaHref="/recipes/new"
		/>
	{:else if orderedRecipes.length === 0}
		<p class="empty">{t('recipes.noSearchResults')}</p>
	{:else if recipeViewMode.current === 'grid'}
		<div class="grid">
			{#each orderedRecipes as recipe (recipe._id)}
				<RecipeCard {recipe} layout="grid" onDelete={(r) => (removingRecipe = r)} />
			{/each}
		</div>
	{:else}
		<div class="list">
			{#each orderedRecipes as recipe (recipe._id)}
				<div
					class="recipe-drag-row"
					class:dragging={drag.isDragging(recipe._id)}
					use:registerRecipeRef={recipe._id}
					style:transform={`translateY(${drag.offsetFor(
						recipe._id,
						orderedRecipes.map((r) => r._id)
					)}px)`}
				>
					<div class="card-flex">
						<RecipeCard
							{recipe}
							onDelete={(r) => (removingRecipe = r)}
							{swipe}
							swipeId={recipe._id}
							dragging={drag.isDragging(recipe._id)}
							onCardPointerDown={(e) =>
								drag.onPointerDown(
									e,
									recipe._id,
									orderedRecipes.map((r) => r._id),
									(ev) => swipe.onPointerDown(ev, recipe._id)
								)}
							onCardPointerMove={(e) => {
								drag.onPointerMove(
									e,
									recipe._id,
									orderedRecipes.map((r) => r._id)
								);
								swipe.onPointerMove(e, recipe._id);
							}}
							onCardPointerUp={() => {
								drag.onPointerUp(recipe._id, (from, to) =>
									recipeOrder.reorder(
										orderedRecipes.map((r) => r._id),
										from,
										to
									)
								);
								swipe.onPointerUp(recipe._id);
							}}
							onCardPointerCancel={() => {
								drag.cancel();
								swipe.onPointerUp(recipe._id);
							}}
						/>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
</PullToRefresh>

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
		/* STO-113: at a large text scale the h1 + 3 action buttons don't fit one row —
		   let the actions block wrap under the title instead of overflowing. */
		flex-wrap: wrap;
	}
	.header h1 {
		flex: 1 1 auto;
		min-width: 0;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.search-input {
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: var(--text-base);
		background: var(--paper-raised);
		color: var(--ink);
	}
	.tag-chiprow {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		padding-bottom: 0.2rem;
	}
	.tag-chip-filter {
		flex: 0 0 auto;
		font-size: var(--text-xs);
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: var(--paper-raised);
		color: var(--ink-soft);
		white-space: nowrap;
		cursor: pointer;
	}
	.tag-chip-filter.active {
		background: var(--accent);
		color: var(--paper-raised);
		border-color: var(--accent);
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}
	.recipe-drag-row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		transition: transform 0.2s ease;
	}
	.recipe-drag-row.dragging {
		z-index: 10;
		transition: none;
	}
	.card-flex {
		flex: 1;
		min-width: 0;
	}
	.recipe-drag-row.dragging {
		cursor: grabbing;
	}
	.empty {
		color: var(--ink-soft);
		font-size: var(--text-base);
	}
	.btn-outline {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.4rem 0.75rem;
		font-size: var(--text-sm);
		text-decoration: none;
		color: var(--ink);
		background: var(--paper-raised);
	}
</style>
