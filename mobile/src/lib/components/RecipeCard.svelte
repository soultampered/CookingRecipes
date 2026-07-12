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
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 0.8rem 0.9rem;
		text-decoration: none;
		color: inherit;
		background: var(--paper-raised);
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
