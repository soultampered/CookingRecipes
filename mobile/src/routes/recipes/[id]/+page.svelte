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
		return data.inventoryNames[id] ?? 'Unknown ingredient';
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
		color: var(--ink-soft);
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
	.description {
		color: var(--ink-soft);
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.field-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
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
		border-bottom: 1px solid var(--line);
	}
	.qty {
		color: var(--ink-soft);
	}
	.instructions {
		padding-left: 1.1rem;
		font-size: 0.9rem;
		line-height: 1.6;
	}
	.btn-outline {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		text-decoration: none;
		color: var(--ink);
		background: var(--paper-raised);
		flex: 0 0 auto;
	}
	.primary {
		padding: 0.75rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
		cursor: pointer;
	}
	.danger {
		padding: 0.65rem;
		border-radius: 8px;
		border: 1px solid var(--bad);
		background: var(--paper-raised);
		color: var(--bad);
		font-weight: 600;
		cursor: pointer;
	}
	.banner {
		background: var(--bad-soft);
		color: var(--bad);
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
