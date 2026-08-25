<script lang="ts">
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="page">
	<a class="back" href="/recipes">{t('suggestions.back')}</a>
	<h1>{t('suggestions.title')}</h1>
	<p class="sub">{t('suggestions.subtitle')}</p>

	{#if data.recipes.length === 0}
		<p class="empty">{t('suggestions.empty')}</p>
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
		gap: 0.6rem;
	}
	.back {
		align-self: flex-start;
		font-size: 0.85rem;
		color: var(--accent);
		text-decoration: none;
	}
	.sub {
		color: var(--ink-soft);
		font-size: 0.85rem;
		margin: 0 0 0.5rem;
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
</style>
