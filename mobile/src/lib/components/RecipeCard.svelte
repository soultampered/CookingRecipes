<script lang="ts">
	import type { Recipe } from '$lib/types/recipe';
	import { t, tRaw } from '$lib/i18n/index.svelte';
	import { swipeToDelete } from '$lib/utils/swipeToDelete.svelte';

	// onDelete is optional — recipes/suggestions/+page.svelte reuses this card without swipe-
	// to-delete (deleting a recipe from "what's fully in stock" isn't a natural action there),
	// while recipes/+page.svelte (see STO-105) passes it to enable the swipe gesture.
	let {
		recipe,
		onDelete,
		layout = 'list'
	}: { recipe: Recipe; onDelete?: (recipe: Recipe) => void; layout?: 'list' | 'grid' } = $props();

	// Warm, food-evocative placeholder palette (stands in for a real recipe photo).
	// Picked deterministically per recipe so the same card always gets the same color.
	const THUMB_COLORS = ['#C9885E', '#8E4A46', '#D9A441', '#6B7A4F', '#B5623A', '#9C6B3E'];

	function thumbColor(id: string) {
		let hash = 0;
		for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
		return THUMB_COLORS[hash % THUMB_COLORS.length];
	}

	// Each card is its own component instance, so a local swipe id ('this') is enough — no
	// need for the shared id-keyed instance the list-of-rows screens use.
	const swipe = onDelete ? swipeToDelete() : null;
</script>

{#snippet cardBody()}
	<div class="thumb" style="background: {thumbColor(recipe._id)};"></div>
	<div class="body">
		<div class="title">{recipe.title}</div>
		<div class="meta">
			<span class="pill pill-{recipe.difficulty}">{tRaw('difficulty', recipe.difficulty)}</span>
			{#if recipe.totalTimeMinutes}<span>{t('recipes.minutes', { count: recipe.totalTimeMinutes })}</span>{/if}
			{#if recipe.servings}<span>{t('recipes.servesCount', { count: recipe.servings })}</span>{/if}
		</div>
	</div>
{/snippet}

{#if layout === 'grid'}
	<div class="grid-wrapper">
		<a class="card grid" href={`/recipes/${recipe._id}`}>
			{@render cardBody()}
		</a>
		{#if onDelete}
			<button
				type="button"
				class="grid-delete"
				onclick={() => onDelete(recipe)}
				aria-label={t('shoppingList.deleteItemAriaLabel', { name: recipe.title })}
			>
				×
			</button>
		{/if}
	</div>
{:else if onDelete && swipe}
	<div class="swipe-wrapper">
		<button
			type="button"
			class="swipe-delete-action"
			onclick={() => {
				onDelete(recipe);
				swipe.close('this');
			}}
			aria-label={t('shoppingList.deleteItemAriaLabel', { name: recipe.title })}
		>
			{t('shoppingList.deleteAction')}
		</button>
		<a
			class="card"
			class:dragging={swipe.isDragging('this')}
			href={`/recipes/${recipe._id}`}
			style:transform={`translateX(${swipe.offsetFor('this')}px)`}
			onpointerdown={(e) => swipe.onPointerDown(e, 'this')}
			onpointermove={(e) => swipe.onPointerMove(e, 'this')}
			onpointerup={() => swipe.onPointerUp('this')}
			onpointercancel={() => swipe.onPointerUp('this')}
			onclick={(e) => swipe.handleClick(e, 'this')}
		>
			{@render cardBody()}
		</a>
	</div>
{:else}
	<a class="card" href={`/recipes/${recipe._id}`}>
		{@render cardBody()}
	</a>
{/if}

<style>
	.swipe-wrapper {
		position: relative;
		overflow: hidden;
		border-radius: 10px;
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
		display: flex;
		align-items: center;
		gap: 0.7rem;
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
	.grid-wrapper {
		position: relative;
	}
	.card.grid {
		flex-direction: column;
		align-items: stretch;
		gap: 0.5rem;
		padding: 0.6rem;
	}
	.card.grid .thumb {
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		border-radius: 8px;
	}
	.card.grid .meta {
		flex-wrap: wrap;
	}
	.grid-delete {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 50%;
		border: none;
		background: rgba(0, 0, 0, 0.55);
		color: #fff;
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
	}
	.thumb {
		width: 40px;
		height: 40px;
		border-radius: 8px;
		flex: 0 0 auto;
	}
	.body {
		min-width: 0;
	}
	.title {
		font-weight: 600;
	}
	.meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-size: 0.8rem;
		color: var(--ink-soft);
		margin-top: 0.25rem;
	}
	.pill {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		text-transform: capitalize;
	}
	.pill-easy {
		background: var(--good-soft);
		color: var(--good);
	}
	.pill-medium {
		background: var(--warn-soft);
		color: var(--warn);
	}
	.pill-hard {
		background: var(--bad-soft);
		color: var(--bad);
	}
</style>
