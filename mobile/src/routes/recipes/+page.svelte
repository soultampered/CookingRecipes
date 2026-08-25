<script lang="ts">
	import { invalidate } from '$app/navigation';
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { deleteRecipe } from '$lib/api/recipes';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import type { Recipe } from '$lib/types/recipe';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

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
			{#each data.recipes as recipe (recipe._id)}
				<RecipeCard {recipe} onDelete={(r) => (removingRecipe = r)} />
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
