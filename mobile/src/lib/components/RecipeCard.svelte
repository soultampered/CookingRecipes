<script lang="ts">
	import type { Recipe } from '$lib/types/recipe';

	let { recipe }: { recipe: Recipe } = $props();
</script>

<a class="card" href={`/recipes/${recipe._id}`}>
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
		display: block;
		border: 1px solid #ddd;
		border-radius: 10px;
		padding: 0.8rem 0.9rem;
		text-decoration: none;
		color: inherit;
	}
	.title {
		font-weight: 600;
	}
	.meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-size: 0.8rem;
		color: #666;
		margin-top: 0.25rem;
	}
	.pill {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
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
</style>
