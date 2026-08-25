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
	let errors = $state<{ name?: string; quantity?: string }>({});

	$effect(() => {
		dirty =
			name !== initialName ||
			quantity !== initialQuantity ||
			unit !== initialUnit ||
			expirationDte !== initialExpiration ||
			lowStockThreshold !== initialLowStock ||
			notes !== initialNotes;
	});

	// The backend's INVALID_INPUT error on missing name/quantity never surfaces as a 400, so
	// this is enforced here instead of relying on the API response.
	function validate(): boolean {
		const next: typeof errors = {};
		if (!name.trim()) next.name = 'Name is required.';
		if (quantity == null || quantity < 0) next.quantity = 'Quantity is required.';
		errors = next;
		return Object.keys(next).length === 0;
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!validate()) return;
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

<form onsubmit={handleSubmit} novalidate>
	<label>
		Name
		<input type="text" bind:value={name} class:invalid={!!errors.name} aria-invalid={!!errors.name} />
		{#if errors.name}<p class="field-error">{errors.name}</p>{/if}
	</label>

	<div class="row">
		<label>
			Quantity
			<input
				type="number"
				min="0"
				step="any"
				bind:value={quantity}
				class:invalid={!!errors.quantity}
				aria-invalid={!!errors.quantity}
			/>
			{#if errors.quantity}<p class="field-error">{errors.quantity}</p>{/if}
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
	input.invalid {
		border-color: var(--bad);
	}
	.field-error {
		color: var(--bad);
		font-size: 0.78rem;
		margin: 0.15rem 0 0;
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
