<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import InventoryForm from '$lib/components/InventoryForm.svelte';
	import { deleteInventoryItem, updateInventoryItem } from '$lib/api/inventory';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import type { NewInventory } from '$lib/types/inventory';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let submitting = $state(false);
	let deleting = $state(false);

	async function handleSubmit(item: NewInventory) {
		submitting = true;
		try {
			await updateInventoryItem(data.item._id, item);
			await invalidate('app:inventory');
			await goto('/inventory');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not update item');
		} finally {
			submitting = false;
		}
	}

	async function handleDelete() {
		deleting = true;
		try {
			await deleteInventoryItem(data.item._id);
			await invalidate('app:inventory');
			await goto('/inventory');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not delete item');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="page">
	<a class="back" href="/inventory">‹ Inventory</a>
	<h1>Edit Item</h1>
	<InventoryForm initial={data.item} submitLabel="Save changes" {submitting} onSubmit={handleSubmit} />
	<button type="button" class="danger" onclick={handleDelete} disabled={deleting}>
		{deleting ? 'Deleting…' : 'Delete item'}
	</button>
</div>

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
	.danger {
		padding: 0.65rem;
		border-radius: 8px;
		border: 1px solid var(--bad);
		background: var(--paper-raised);
		color: var(--bad);
		font-weight: 600;
		cursor: pointer;
	}
</style>
