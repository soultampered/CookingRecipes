<script lang="ts">
	import { goto } from '$app/navigation';
	import InventoryForm from '$lib/components/InventoryForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { unsavedChangesGuard } from '$lib/utils/unsavedChangesGuard.svelte';
	import { createInventoryItem } from '$lib/api/inventory';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import type { NewInventory } from '$lib/types/inventory';

	let submitting = $state(false);
	let dirty = $state(false);
	const leaveGuard = unsavedChangesGuard(() => dirty);

	async function handleSubmit(item: NewInventory) {
		submitting = true;
		try {
			await createInventoryItem(item);
			leaveGuard.allowNext();
			await goto('/inventory');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('inventoryNew.error'));
		} finally {
			submitting = false;
		}
	}
</script>

<div class="page">
	<a class="back" href="/inventory">{t('inventoryNew.back')}</a>
	<h1>{t('inventoryNew.title')}</h1>
	<InventoryForm submitLabel={t('inventoryNew.saveLabel')} {submitting} onSubmit={handleSubmit} bind:dirty />
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
