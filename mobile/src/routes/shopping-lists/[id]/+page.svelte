<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { addItem, deleteShoppingList, removeItem, toggleItemChecked } from '$lib/api/shoppingLists';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let itemName = $state('');
	let itemQuantity = $state(1);
	let adding = $state(false);
	let deleting = $state(false);

	async function handleAddItem(event: SubmitEvent) {
		event.preventDefault();
		adding = true;
		try {
			await addItem(data.list._id!, { name: itemName, quantity: itemQuantity });
			itemName = '';
			itemQuantity = 1;
			await invalidate(`app:shopping-list:${data.list._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not add item');
		} finally {
			adding = false;
		}
	}

	async function handleToggle(itemId: string) {
		try {
			await toggleItemChecked(data.list._id!, itemId);
			await invalidate(`app:shopping-list:${data.list._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not update item');
		}
	}

	async function handleRemove(itemId: string) {
		try {
			await removeItem(data.list._id!, itemId);
			await invalidate(`app:shopping-list:${data.list._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not remove item');
		}
	}

	async function handleDeleteList() {
		deleting = true;
		try {
			await deleteShoppingList(data.list._id!);
			await goto('/shopping-lists');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not delete list');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="page">
	<h1>{data.list.name}</h1>

	{#if data.list.items.length === 0}
		<p class="empty">No items yet.</p>
	{:else}
		<div class="items">
			{#each data.list.items as item (item._id)}
				<div class="item-row">
					<input
						type="checkbox"
						checked={item.checked}
						onchange={() => handleToggle(item._id!)}
					/>
					<span class="item-name" class:checked={item.checked}>{item.name}</span>
					<span class="item-qty">{item.quantity}</span>
					<button type="button" class="remove" onclick={() => handleRemove(item._id!)}>×</button>
				</div>
			{/each}
		</div>
	{/if}

	<form onsubmit={handleAddItem}>
		<input type="text" placeholder="Item name" bind:value={itemName} required />
		<input type="number" min="1" bind:value={itemQuantity} />
		<button type="submit" disabled={adding}>{adding ? 'Adding…' : '+ Add'}</button>
	</form>

	<button type="button" class="danger" onclick={handleDeleteList} disabled={deleting}>
		{deleting ? 'Deleting…' : 'Delete list'}
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
	.items {
		display: flex;
		flex-direction: column;
	}
	.item-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--line);
	}
	.item-name {
		flex: 1;
		font-size: 0.9rem;
	}
	.item-name.checked {
		color: var(--ink-soft);
		text-decoration: line-through;
	}
	.item-qty {
		font-size: 0.85rem;
		color: var(--ink-soft);
		font-variant-numeric: tabular-nums;
	}
	.remove {
		border: none;
		background: none;
		color: var(--bad);
		font-size: 1.1rem;
		cursor: pointer;
		flex: 0 0 auto;
		padding: 0 0.3rem;
	}
	.empty {
		color: var(--ink-soft);
		font-size: 0.9rem;
	}
	form {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.4rem;
	}
	form input[type='text'] {
		flex: 2;
	}
	form input[type='number'] {
		flex: 1;
		min-width: 0;
	}
	input {
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 0.9rem;
		background: var(--paper-raised);
		color: var(--ink);
	}
	form button {
		padding: 0.55rem 0.9rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
		cursor: pointer;
		flex: 0 0 auto;
	}
	.danger {
		margin-top: 0.5rem;
		padding: 0.65rem;
		border-radius: 8px;
		border: 1px solid var(--bad);
		background: var(--paper-raised);
		color: var(--bad);
		font-weight: 600;
		cursor: pointer;
	}
</style>
