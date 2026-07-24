<script lang="ts">
	import { goto } from '$app/navigation';
	import { createShoppingList } from '$lib/api/shoppingLists';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';

	let name = $state('');
	let submitting = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		try {
			const list = await createShoppingList({ name, items: [] });
			await goto(`/shopping-lists/${list._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not create list');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="page">
	<a class="back" href="/shopping-lists">‹ Shopping Lists</a>
	<h1>New List</h1>
	<form onsubmit={handleSubmit}>
		<label>
			Name
			<input type="text" bind:value={name} required />
		</label>
		<button type="submit" class="primary" disabled={submitting}>
			{submitting ? 'Creating…' : 'Create list'}
		</button>
	</form>
</div>

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
	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.85rem;
	}
	input {
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 1rem;
		background: var(--paper-raised);
		color: var(--ink);
	}
	.primary {
		margin-top: 0.4rem;
		padding: 0.75rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
		cursor: pointer;
	}
</style>
