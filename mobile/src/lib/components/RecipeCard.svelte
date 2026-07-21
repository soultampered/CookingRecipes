<script lang="ts">
	import type { Recipe } from '$lib/types/recipe';

	let { recipe }: { recipe: Recipe } = $props();

	// Warm, food-evocative placeholder palette (stands in for a real recipe photo).
	// Picked deterministically per recipe so the same card always gets the same color.
	const THUMB_COLORS = ['#C9885E', '#8E4A46', '#D9A441', '#6B7A4F', '#B5623A', '#9C6B3E'];

	function thumbColor(id: string) {
		let hash = 0;
		for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
		return THUMB_COLORS[hash % THUMB_COLORS.length];
	}
</script>

<a class="card" href={`/recipes/${recipe._id}`}>
	<div class="thumb" style="background: {thumbColor(recipe._id)};"></div>
	<div class="body">
		<div class="title">{recipe.title}</div>
		<div class="meta">
			<span class="pill pill-{recipe.difficulty}">{recipe.difficulty}</span>
			{#if recipe.totalTimeMinutes}<span>{recipe.totalTimeMinutes} min</span>{/if}
			{#if recipe.servings}<span>serves {recipe.servings}</span>{/if}
		</div>
	</div>
</a>

<style>
	.card {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 0.8rem 0.9rem;
		text-decoration: none;
		color: inherit;
		background: var(--paper-raised);
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
