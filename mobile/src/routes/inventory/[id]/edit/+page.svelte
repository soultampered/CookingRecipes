<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import InventoryForm from '$lib/components/InventoryForm.svelte';
	import { deleteInventoryItem, updateInventoryItem } from '$lib/api/inventory';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { unsavedChangesGuard } from '$lib/utils/unsavedChangesGuard.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import type { NewInventory } from '$lib/types/inventory';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let submitting = $state(false);
	let deleting = $state(false);
	let confirmingDelete = $state(false);
	let dirty = $state(false);
	const leaveGuard = unsavedChangesGuard(() => dirty);

	async function handleSubmit(item: NewInventory) {
		submitting = true;
		try {
			await updateInventoryItem(data.item._id, item);
			await invalidate('app:inventory');
			leaveGuard.allowNext();
			await goto('/inventory');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('inventoryEdit.errorUpdate'));
		} finally {
			submitting = false;
		}
	}

	async function confirmDelete() {
		deleting = true;
		try {
			await deleteInventoryItem(data.item._id);
			await invalidate('app:inventory');
			leaveGuard.allowNext();
			await goto('/inventory');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('inventoryEdit.errorDelete'));
			deleting = false;
			confirmingDelete = false;
		}
	}
</script>

<div class="page">
	<a class="back" href="/inventory">{t('inventoryEdit.back')}</a>
	<h1>{t('inventoryEdit.title')}</h1>
	<InventoryForm
		initial={data.item}
		submitLabel={t('inventoryEdit.saveLabel')}
		{submitting}
		onSubmit={handleSubmit}
		bind:dirty
	/>
	<div class="danger-zone">
		<button type="button" class="danger-link" onclick={() => (confirmingDelete = true)}>
			{t('inventoryEdit.deleteItem')}
		</button>
	</div>
</div>

<ConfirmModal
	open={confirmingDelete}
	title={t('inventoryEdit.deleteTitle')}
	message={t('inventoryEdit.deleteMessage', { name: data.item.name })}
	confirmLabel={t('inventoryEdit.deleteItem')}
	confirmingLabel={t('common.deleting')}
	cancelLabel={t('common.cancel')}
	confirming={deleting}
	onConfirm={confirmDelete}
	onCancel={() => (confirmingDelete = false)}
/>

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
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.back {
		align-self: flex-start;
		font-size: 0.85rem;
		color: var(--accent);
		text-decoration: none;
	}
	.danger-zone {
		margin-top: 0.6rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--line);
		display: flex;
	}
	.danger-link {
		border: none;
		background: none;
		color: var(--bad);
		font-size: 0.85rem;
		text-decoration: underline;
		cursor: pointer;
		padding: 0;
	}
</style>
