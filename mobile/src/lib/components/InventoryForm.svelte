<script lang="ts">
	import type { InventoryCategory, NewInventory } from '$lib/types/inventory';
	import { INVENTORY_CATEGORIES } from '$lib/types/inventory';
	import { UNITS, type Unit } from '$lib/types/unit';

	let {
		initial,
		submitLabel,
		submitting,
		onSubmit
	}: {
		initial?: Partial<NewInventory>;
		submitLabel: string;
		submitting: boolean;
		onSubmit: (data: NewInventory) => void;
	} = $props();

	let name = $state(initial?.name ?? '');
	let quantity = $state(initial?.quantity ?? 0);
	let unit = $state<Unit>(initial?.unit ?? 'g');
	let category = $state<InventoryCategory | ''>(initial?.category ?? '');
	let expirationDte = $state(initial?.expirationDte?.slice(0, 10) ?? '');
	let notes = $state(initial?.notes ?? '');
	let error = $state('');

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		// The backend's INVALID_INPUT error on missing name/quantity never surfaces as a 400,
		// so this is enforced here instead of relying on the API response.
		if (!name.trim() || quantity == null) {
			error = 'Name and quantity are required.';
			return;
		}
		error = '';
		onSubmit({
			name: name.trim(),
			quantity,
			unit,
			category: category || undefined,
			expirationDte: expirationDte || undefined,
			notes: notes || undefined,
			userId: initial?.userId ?? ''
		});
	}
</script>

<form onsubmit={handleSubmit}>
	{#if error}<p class="error">{error}</p>{/if}

	<label>
		Name
		<input type="text" bind:value={name} required />
	</label>

	<div class="row">
		<label>
			Quantity
			<input type="number" min="0" step="any" bind:value={quantity} />
		</label>
		<label>
			Unit
			<select bind:value={unit}>
				{#each UNITS as u}
					<option value={u}>{u}</option>
				{/each}
			</select>
		</label>
	</div>

	<label>
		Category
		<select bind:value={category}>
			<option value="">None</option>
			{#each INVENTORY_CATEGORIES as c}
				<option value={c}>{c}</option>
			{/each}
		</select>
	</label>

	<label>
		Expiration
		<input type="date" bind:value={expirationDte} />
	</label>

	<label>
		Notes
		<textarea bind:value={notes} rows="2"></textarea>
	</label>

	<button type="submit" class="primary" disabled={submitting}>
		{submitting ? 'Saving…' : submitLabel}
	</button>
</form>

<style>
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
	.row {
		display: flex;
		gap: 0.6rem;
	}
	.row label {
		flex: 1;
	}
	input,
	textarea,
	select {
		padding: 0.55rem 0.65rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 0.95rem;
		font-family: inherit;
	}
	.error {
		color: #a23629;
		font-size: 0.85rem;
		margin: 0;
	}
	.primary {
		margin-top: 0.4rem;
		padding: 0.75rem;
		border-radius: 8px;
		border: none;
		background: #6e3550;
		color: white;
		font-weight: 600;
		cursor: pointer;
	}
</style>
