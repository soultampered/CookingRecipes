<script lang="ts">
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="page">
	<h1>Suggestions</h1>
	<p class="sub">Fully in stock — ready to cook right now.</p>

	{#if data.recipes.length === 0}
		<p class="empty">Nothing is fully stocked yet. Check Inventory to see what's missing.</p>
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
	.sub {
		color: #666;
		font-size: 0.85rem;
		margin: 0 0 0.5rem;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.empty {
		color: #666;
		font-size: 0.9rem;
	}
</style>
