<script lang="ts">
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
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
				<RecipeCard {recipe} />
			{/each}
		</div>
	{/if}
</div>

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
