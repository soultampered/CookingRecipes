<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { deleteRecipe, getMissingIngredients, prepareRecipe } from '$lib/api/recipes';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import type { MissingIngredient } from '$lib/types/recipe';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let preparing = $state(false);
	let deleting = $state(false);
	let missing = $state<MissingIngredient[] | null>(null);

	function inventoryName(id: string) {
		return data.inventoryItems.find((i) => i._id === id)?.name ?? id;
	}

	async function handlePrepare() {
		preparing = true;
		missing = null;
		try {
			await prepareRecipe(data.recipe._id);
			toast.push('Recipe prepared — inventory updated.', 'info');
			await invalidate(`app:recipe:${data.recipe._id}`);
		} catch (err) {
			try {
				missing = await getMissingIngredients(data.recipe._id);
			} catch {
				toast.push(err instanceof ApiError ? err.message : 'Could not prepare recipe');
			}
		} finally {
			preparing = false;
		}
	}

	async function handleDelete() {
		deleting = true;
		try {
			await deleteRecipe(data.recipe._id);
			await goto('/recipes');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not delete recipe');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="page">
	<div class="header">
		<div>
			<h1>{data.recipe.title}</h1>
			<div class="meta">
				<span class="pill pill-{data.recipe.difficulty}">{data.recipe.difficulty}</span>
				{#if data.recipe.totalTimeMinutes}<span>{data.recipe.totalTimeMinutes} min</span>{/if}
				{#if data.recipe.servings}<span>serves {data.recipe.servings}</span>{/if}
			</div>
		</div>
		<a href={`/recipes/${data.recipe._id}/edit`} class="btn-outline">Edit</a>
	</div>

	{#if data.recipe.description}
		<p class="description">{data.recipe.description}</p>
	{/if}

	<div class="field-label">Ingredients</div>
	<div class="ingredients">
		{#each data.recipe.ingredients as ingredient}
			<div class="ingredient-row">
				<span>{inventoryName(ingredient.inventoryItemId)}</span>
				<span class="qty">{ingredient.quantity}{ingredient.unit ? ` ${ingredient.unit}` : ''}</span>
			</div>
		{/each}
	</div>

	<div class="field-label">Instructions</div>
	<ol class="instructions">
		{#each data.recipe.instructions as step}
			<li>{step}</li>
		{/each}
	</ol>

	<button type="button" class="primary" onclick={handlePrepare} disabled={preparing}>
		{preparing ? 'Preparing…' : 'Prepare'}
	</button>

	{#if missing && missing.length > 0}
		<div class="banner">
			<strong>Can't prepare — missing {missing.length} ingredient{missing.length > 1 ? 's' : ''}</strong>
			{#each missing as item}
				<div>{item.name} ({item.needed}{item.unit ? ` ${item.unit}` : ''})</div>
			{/each}
		</div>
	{/if}

	<button type="button" class="danger" onclick={handleDelete} disabled={deleting}>
		{deleting ? 'Deleting…' : 'Delete recipe'}
	</button>
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
	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
	}
	h1 {
		margin: 0 0 0.2rem;
	}
	.meta {
		display: flex;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: #666;
	}
	.pill {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		text-transform: capitalize;
	}
	.pill-easy {
		background: #e7eedf;
		color: #4c6b3f;
	}
	.pill-medium {
		background: #f5e9d3;
		color: #9c6a0e;
	}
	.pill-hard {
		background: #f5e1de;
		color: #a23629;
	}
	.description {
		color: #444;
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.field-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #666;
	}
	.ingredients {
		display: flex;
		flex-direction: column;
	}
	.ingredient-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid #eee;
	}
	.qty {
		color: #666;
	}
	.instructions {
		padding-left: 1.1rem;
		font-size: 0.9rem;
		line-height: 1.6;
	}
	.btn-outline {
		border: 1px solid #ccc;
		border-radius: 8px;
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		text-decoration: none;
		color: inherit;
		flex: 0 0 auto;
	}
	.primary {
		padding: 0.75rem;
		border-radius: 8px;
		border: none;
		background: #6e3550;
		color: white;
		font-weight: 600;
		cursor: pointer;
	}
	.danger {
		padding: 0.65rem;
		border-radius: 8px;
		border: 1px solid #a23629;
		background: none;
		color: #a23629;
		font-weight: 600;
		cursor: pointer;
	}
	.banner {
		background: #f5e1de;
		color: #a23629;
		border-radius: 8px;
		padding: 0.7rem 0.8rem;
		font-size: 0.85rem;
		line-height: 1.5;
	}
	.banner strong {
		display: block;
		margin-bottom: 0.2rem;
	}
</style>
