<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { updateRecipe } from '$lib/api/recipes';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import type { Recipe } from '$lib/types/recipe';

	// Favorite + 1–5 stars; tapping the current star clears.
	let { recipe }: { recipe: Recipe } = $props();

	let favorite = $derived(recipe.favorite ?? false);
	let rating = $derived(recipe.rating ?? null);

	async function save(patch: Partial<Recipe>) {
		try {
			await updateRecipe(recipe._id, patch);
			await invalidate(`app:recipe:${recipe._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('rating.error'));
		}
	}
</script>

<div class="rating">
	<button
		type="button"
		class="heart"
		class:on={favorite}
		aria-pressed={favorite}
		aria-label={favorite ? t('rating.unfavorite') : t('rating.favorite')}
		onclick={() => save({ favorite: !favorite })}
	>
		{favorite ? '♥' : '♡'}
	</button>
	<div class="stars" role="group" aria-label={t('rating.clear')}>
		{#each [1, 2, 3, 4, 5] as n (n)}
			<button
				type="button"
				class="star"
				class:on={rating !== null && n <= rating}
				aria-label={rating === n ? t('rating.clear') : t('rating.stars', { count: n })}
				onclick={() => save({ rating: rating === n ? null : n })}
			>
				★
			</button>
		{/each}
	</div>
</div>

<style>
	.rating {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.heart,
	.star {
		border: none;
		background: none;
		padding: 0.1rem;
		cursor: pointer;
		line-height: 1;
	}
	.heart {
		font-size: 1.35rem;
		color: var(--ink-soft);
	}
	.heart.on {
		color: var(--bad);
	}
	.stars {
		display: flex;
	}
	.star {
		font-size: 1.15rem;
		color: var(--line);
	}
	.star.on {
		color: var(--warn);
	}
</style>
