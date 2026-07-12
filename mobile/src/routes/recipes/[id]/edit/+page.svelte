<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import RecipeForm from '$lib/components/RecipeForm.svelte';
	import { updateRecipe } from '$lib/api/recipes';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import type { NewRecipe } from '$lib/types/recipe';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let submitting = $state(false);

	async function handleSubmit(recipe: NewRecipe) {
		submitting = true;
		try {
			await updateRecipe(data.recipe._id, recipe);
			await invalidate(`app:recipe:${data.recipe._id}`);
			await goto(`/recipes/${data.recipe._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not update recipe');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="page">
	<h1>Edit Recipe</h1>
	<RecipeForm
		inventoryItems={data.inventoryItems}
		initial={data.recipe}
		submitLabel="Save changes"
		{submitting}
		onSubmit={handleSubmit}
	/>
</div>

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem;
	}
</style>
