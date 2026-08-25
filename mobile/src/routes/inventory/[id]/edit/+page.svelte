<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import InventoryForm from '$lib/components/InventoryForm.svelte';
	import { deleteInventoryItem, updateInventoryItem } from '$lib/api/inventory';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { unsavedChangesGuard } from '$lib/utils/unsavedChangesGuard.svelte';
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
			toast.push(err instanceof ApiError ? err.message : 'Could not update item');
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
			toast.push(err instanceof ApiError ? err.message : 'Could not delete item');
			deleting = false;
			confirmingDelete = false;
		}
	}
</script>

<div class="page">
	<a class="back" href="/inventory">‹ Inventory</a>
	<h1>Edit Item</h1>
	<InventoryForm
		initial={data.item}
		submitLabel="Save changes"
		{submitting}
		onSubmit={handleSubmit}
		bind:dirty
	/>
	<div class="danger-zone">
		<button type="button" class="danger-link" onclick={() => (confirmingDelete = true)}>
			Delete item
		</button>
	</div>
</div>

<ConfirmModal
	open={confirmingDelete}
	title="Delete item?"
	message={`This will permanently delete "${data.item.name}" from your inventory.`}
	confirmLabel="Delete item"
	confirming={deleting}
	onConfirm={confirmDelete}
	onCancel={() => (confirmingDelete = false)}
/>

<ConfirmModal
	open={leaveGuard.confirming}
	title="Discard changes?"
	message="You have unsaved changes that will be lost if you leave this page."
	confirmLabel="Discard"
	confirmingLabel="Discard"
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
