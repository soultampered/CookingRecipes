<script lang="ts">
	import { goto } from '$app/navigation';
	import RecipeForm from '$lib/components/RecipeForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { unsavedChangesGuard } from '$lib/utils/unsavedChangesGuard.svelte';
	import { createRecipe } from '$lib/api/recipes';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { session } from '$lib/state/session.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import type { NewRecipe } from '$lib/types/recipe';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let submitting = $state(false);
	let dirty = $state(false);
	const leaveGuard = unsavedChangesGuard(() => dirty);

	async function handleSubmit(recipe: NewRecipe) {
		submitting = true;
		try {
			const created = await createRecipe(recipe);
			leaveGuard.allowNext();
			await goto(`/recipes/${created._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('recipeNew.error'));
		} finally {
			submitting = false;
		}
	}
</script>

<div class="page">
	<a class="back" href="/recipes">{t('recipeNew.back')}</a>
	<h1>{t('recipeNew.title')}</h1>
	<RecipeForm
		inventoryItems={data.inventoryItems}
		initial={{ author: session.user?.username ?? '' }}
		submitLabel={t('recipeNew.saveLabel')}
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
	.back {
		display: inline-block;
		margin-bottom: 0.5rem;
		font-size: 0.85rem;
		color: var(--accent);
		text-decoration: none;
	}
</style>
