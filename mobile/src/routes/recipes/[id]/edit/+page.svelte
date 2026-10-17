<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import RecipeForm from '$lib/components/RecipeForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { unsavedChangesGuard } from '$lib/utils/unsavedChangesGuard.svelte';
	import { updateRecipe } from '$lib/api/recipes';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import type { NewRecipe } from '$lib/types/recipe';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let submitting = $state(false);
	let dirty = $state(false);
	// STO-89: saved on the version history entry, not the recipe.
	let editNote = $state('');
	const leaveGuard = unsavedChangesGuard(() => dirty);

	async function handleSubmit(recipe: NewRecipe) {
		submitting = true;
		try {
			await updateRecipe(data.recipe._id, { ...recipe, editNote: editNote.trim() || undefined });
			await invalidate(`app:recipe:${data.recipe._id}`);
			leaveGuard.allowNext();
			await goto(`/recipes/${data.recipe._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('recipeEdit.error'));
		} finally {
			submitting = false;
		}
	}
</script>

<div class="page">
	<a class="back" href={`/recipes/${data.recipe._id}`}>‹ {data.recipe.title}</a>
	<h1>{t('recipeEdit.title')}</h1>
	<input
		class="edit-note"
		type="text"
		maxlength="500"
		placeholder={t('recipeEdit.notePlaceholder')}
		aria-label={t('recipeEdit.notePlaceholder')}
		bind:value={editNote}
	/>
	<RecipeForm
		inventoryItems={data.inventoryItems}
		initial={data.recipe}
		submitLabel={t('recipeEdit.saveLabel')}
		{submitting}
		onSubmit={handleSubmit}
		bind:dirty
	/>
</div>

<ConfirmModal
	open={leaveGuard.confirming}
	title={t('unsaved.title')}
	message={t('unsaved.message')}
	confirmLabel={t('unsaved.discard')}
	confirmingLabel={t('unsaved.discard')}
	cancelLabel={t('common.cancel')}
	onConfirm={leaveGuard.confirmLeave}
	onCancel={leaveGuard.cancelLeave}
/>

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem;
	}
	.edit-note {
		width: 100%;
		box-sizing: border-box;
		margin-bottom: 0.75rem;
		padding: 0.55rem 0.7rem;
		border: 1px dashed var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
		font-size: var(--text-sm);
	}
	.back {
		display: inline-block;
		margin-bottom: 0.5rem;
		font-size: 0.85rem;
		color: var(--accent);
		text-decoration: none;
	}
</style>
