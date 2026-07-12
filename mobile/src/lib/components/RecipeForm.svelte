<script lang="ts">
	import type { DifficultyLevel, NewRecipe, RecipeIngredient } from '$lib/types/recipe';
	import type { Inventory } from '$lib/types/inventory';
	import { UNITS } from '$lib/types/unit';

	let {
		initial,
		inventoryItems,
		submitLabel,
		submitting,
		onSubmit
	}: {
		initial?: Partial<NewRecipe>;
		inventoryItems: Inventory[];
		submitLabel: string;
		submitting: boolean;
		onSubmit: (data: NewRecipe) => void;
	} = $props();

	let title = $state(initial?.title ?? '');
	let description = $state(initial?.description ?? '');
	let author = $state(initial?.author ?? '');
	let difficulty = $state<DifficultyLevel>(initial?.difficulty ?? 'easy');
	let servings = $state(initial?.servings ?? 4);
	let prepTimeMinutes = $state(initial?.prepTimeMinutes);
	let cookTimeMinutes = $state(initial?.cookTimeMinutes);
	let instructions = $state<string[]>(initial?.instructions?.length ? [...initial.instructions] : ['']);
	let ingredients = $state<RecipeIngredient[]>(
		initial?.ingredients?.length
			? initial.ingredients.map((i) => ({ ...i }))
			: inventoryItems.length
				? [{ inventoryItemId: inventoryItems[0]._id, quantity: 1, unit: inventoryItems[0].unit }]
				: []
	);

	function addIngredient() {
		if (!inventoryItems.length) return;
		ingredients.push({ inventoryItemId: inventoryItems[0]._id, quantity: 1, unit: inventoryItems[0].unit });
	}

	function removeIngredient(index: number) {
		ingredients = ingredients.filter((_, i) => i !== index);
	}

	function addInstruction() {
		instructions.push('');
	}

	function removeInstruction(index: number) {
		instructions = instructions.filter((_, i) => i !== index);
	}

	function inventoryName(id: string) {
		return inventoryItems.find((i) => i._id === id)?.name ?? id;
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		onSubmit({
			title,
			description: description || undefined,
			author,
			difficulty,
			servings,
			prepTimeMinutes,
			cookTimeMinutes,
			totalTimeMinutes:
				(prepTimeMinutes ?? 0) + (cookTimeMinutes ?? 0) || undefined,
			ingredients,
			instructions: instructions.filter((line) => line.trim().length > 0),
			nutrition: []
		});
	}
</script>

<form onsubmit={handleSubmit}>
	<label>
		Title
		<input type="text" bind:value={title} required />
	</label>

	<label>
		Description
		<textarea bind:value={description} rows="2"></textarea>
	</label>

	<label>
		Author
		<input type="text" bind:value={author} required />
	</label>

	<div class="field-label">Difficulty</div>
	<div class="chiprow">
		{#each ['easy', 'medium', 'hard'] as const as level}
			<button
				type="button"
				class="chip"
				class:active={difficulty === level}
				onclick={() => (difficulty = level)}
			>
				{level}
			</button>
		{/each}
	</div>

	<div class="row">
		<label>
			Servings
			<input type="number" min="1" bind:value={servings} />
		</label>
		<label>
			Prep (min)
			<input type="number" min="0" bind:value={prepTimeMinutes} />
		</label>
		<label>
			Cook (min)
			<input type="number" min="0" bind:value={cookTimeMinutes} />
		</label>
	</div>

	<div class="field-label">Ingredients</div>
	{#if inventoryItems.length === 0}
		<p class="hint">Add inventory items first so you have something to reference here.</p>
	{/if}
	{#each ingredients as ingredient, index}
		<div class="ingredient-row">
			<select bind:value={ingredient.inventoryItemId}>
				{#each inventoryItems as item}
					<option value={item._id}>{item.name}</option>
				{/each}
			</select>
			<input type="number" min="0" step="any" bind:value={ingredient.quantity} />
			<select bind:value={ingredient.unit}>
				{#each UNITS as unit}
					<option value={unit}>{unit}</option>
				{/each}
			</select>
			<button type="button" class="remove" onclick={() => removeIngredient(index)}>×</button>
		</div>
	{/each}
	<button type="button" class="link" onclick={addIngredient} disabled={!inventoryItems.length}>
		+ Add ingredient
	</button>

	<div class="field-label">Instructions</div>
	{#each instructions as _, index}
		<div class="instruction-row">
			<span class="step">{index + 1}.</span>
			<textarea bind:value={instructions[index]} rows="2"></textarea>
			<button type="button" class="remove" onclick={() => removeInstruction(index)}>×</button>
		</div>
	{/each}
	<button type="button" class="link" onclick={addInstruction}>+ Add step</button>

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
	input,
	textarea,
	select {
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 0.95rem;
		font-family: inherit;
		background: var(--paper-raised);
		color: var(--ink);
	}
	.row {
		display: flex;
		gap: 0.6rem;
	}
	.row label {
		flex: 1;
	}
	.field-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
		margin-top: 0.3rem;
	}
	.chiprow {
		display: flex;
		gap: 0.4rem;
	}
	.chip {
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 0.35rem 0.8rem;
		font-size: 0.8rem;
		background: var(--paper-raised);
		color: var(--ink);
		cursor: pointer;
		text-transform: capitalize;
	}
	.chip.active {
		background: var(--ink);
		color: var(--paper-raised);
		border-color: var(--ink);
	}
	.ingredient-row,
	.instruction-row {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}
	.ingredient-row select:first-child {
		flex: 2;
	}
	.ingredient-row input {
		flex: 1;
		min-width: 0;
	}
	.ingredient-row select:last-of-type {
		flex: 1;
	}
	.instruction-row textarea {
		flex: 1;
	}
	.step {
		font-size: 0.8rem;
		color: var(--ink-soft);
		flex: 0 0 auto;
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
	.link {
		align-self: flex-start;
		border: none;
		background: none;
		color: var(--accent);
		font-size: 0.85rem;
		cursor: pointer;
		padding: 0;
	}
	.hint {
		font-size: 0.8rem;
		color: var(--ink-soft);
	}
	.primary {
		margin-top: 0.5rem;
		padding: 0.75rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
		cursor: pointer;
	}
</style>
