<script lang="ts">
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="page">
	<div class="header">
		<h1>Recipes</h1>
		<a class="btn-outline" href="/recipes/new">+ New recipe</a>
	</div>

	{#if data.recipes.length === 0}
		<p class="empty">No recipes yet. Create your first one.</p>
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
