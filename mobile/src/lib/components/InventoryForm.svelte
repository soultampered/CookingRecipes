<script lang="ts">
	import type { NewInventory } from '$lib/types/inventory';
	import { UNITS, type Unit } from '$lib/types/unit';

	let {
		initial,
		submitLabel,
		submitting,
		onSubmit,
		dirty = $bindable(false)
	}: {
		initial?: Partial<NewInventory>;
		submitLabel: string;
		submitting: boolean;
		onSubmit: (data: NewInventory) => void;
		dirty?: boolean;
	} = $props();

	const initialName = initial?.name ?? '';
	const initialQuantity = initial?.quantity ?? 0;
	const initialUnit = initial?.unit ?? 'g';
	const initialExpiration = initial?.expirationDte?.slice(0, 10) ?? '';
	const initialLowStock = initial?.lowStockThreshold ?? undefined;
	const initialNotes = initial?.notes ?? '';

	let name = $state(initialName);
	let quantity = $state(initialQuantity);
	let unit = $state<Unit>(initialUnit);
	let expirationDte = $state(initialExpiration);
	let lowStockThreshold = $state(initialLowStock);
	let notes = $state(initialNotes);
	let error = $state('');

	$effect(() => {
		dirty =
			name !== initialName ||
			quantity !== initialQuantity ||
			unit !== initialUnit ||
			expirationDte !== initialExpiration ||
			lowStockThreshold !== initialLowStock ||
			notes !== initialNotes;
	});

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
			expirationDte: expirationDte || undefined,
			lowStockThreshold: lowStockThreshold ?? undefined,
			notes: notes || undefined
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
		Expiration
		<input type="date" bind:value={expirationDte} />
	</label>

	<label>
		Low stock alert below
		<input type="number" min="0" step="any" placeholder="Off" bind:value={lowStockThreshold} />
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
		min-width: 0;
	}
	input,
	textarea,
	select {
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 1rem;
		font-family: inherit;
		background: var(--paper-raised);
		color: var(--ink);
	}
	.error {
		color: var(--bad);
		font-size: 0.85rem;
		margin: 0;
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
