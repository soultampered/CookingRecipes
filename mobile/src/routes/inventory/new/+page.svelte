<script lang="ts">
	import { goto } from '$app/navigation';
	import InventoryForm from '$lib/components/InventoryForm.svelte';
	import { createInventoryItem } from '$lib/api/inventory';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import type { NewInventory } from '$lib/types/inventory';

	let submitting = $state(false);

	async function handleSubmit(item: NewInventory) {
		submitting = true;
		try {
			await createInventoryItem(item);
			await goto('/inventory');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not create item');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="page">
	<h1>New Item</h1>
	<InventoryForm submitLabel="Save item" {submitting} onSubmit={handleSubmit} />
</div>

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem;
	}
</style>
