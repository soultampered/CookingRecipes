<script lang="ts">
	import type { DifficultyLevel, NewRecipe, RecipeIngredient } from '$lib/types/recipe';
	import type { Inventory } from '$lib/types/inventory';
	import { UNITS } from '$lib/types/unit';

	let {
		initial,
		inventoryItems,
		submitLabel,
		submitting,
		onSubmit,
		dirty = $bindable(false)
	}: {
		initial?: Partial<NewRecipe>;
		inventoryItems: Inventory[];
		submitLabel: string;
		submitting: boolean;
		onSubmit: (data: NewRecipe) => void;
		dirty?: boolean;
	} = $props();

	const initialTitle = initial?.title ?? '';
	const initialDescription = initial?.description ?? '';
	const initialAuthor = initial?.author ?? '';
	const initialDifficulty = initial?.difficulty ?? 'easy';
	const initialServings = initial?.servings ?? 4;
	const initialPrepTime = initial?.prepTimeMinutes;
	const initialCookTime = initial?.cookTimeMinutes;
	const initialInstructions = initial?.instructions?.length ? [...initial.instructions] : [''];
	const initialIngredients = initial?.ingredients?.length
		? initial.ingredients.map((i) => ({ ...i }))
		: inventoryItems.length
			? [{ inventoryItemId: inventoryItems[0]._id, quantity: 1, unit: inventoryItems[0].unit }]
			: [];
	const initialSnapshot = JSON.stringify({
		title: initialTitle,
		description: initialDescription,
		author: initialAuthor,
		difficulty: initialDifficulty,
		servings: initialServings,
		prepTimeMinutes: initialPrepTime,
		cookTimeMinutes: initialCookTime,
		instructions: initialInstructions,
		ingredients: initialIngredients
	});

	let title = $state(initialTitle);
	let description = $state(initialDescription);
	let author = $state(initialAuthor);
	let difficulty = $state<DifficultyLevel>(initialDifficulty);
	let servings = $state(initialServings);
	let prepTimeMinutes = $state(initialPrepTime);
	let cookTimeMinutes = $state(initialCookTime);
	let instructions = $state<string[]>(initialInstructions);
	let ingredients = $state<RecipeIngredient[]>(initialIngredients);

	$effect(() => {
		dirty =
			JSON.stringify({
				title,
				description,
				author,
				difficulty,
				servings,
				prepTimeMinutes,
				cookTimeMinutes,
				instructions,
				ingredients
			}) !== initialSnapshot;
	});

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

	function moveInstruction(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= instructions.length) return;
		const copy = [...instructions];
		[copy[index], copy[target]] = [copy[target], copy[index]];
		instructions = copy;
	}

	function inventoryName(id: string) {
		return inventoryItems.find((i) => i._id === id)?.name ?? id;
	}

	let errors = $state<{ title?: string; author?: string; servings?: string; instructions?: string }>(
		{}
	);

	function validate(): boolean {
		const next: typeof errors = {};
		if (!title.trim()) next.title = 'Title is required.';
		if (!author.trim()) next.author = 'Author is required.';
		if (!servings || servings < 1) next.servings = 'Servings must be at least 1.';
		if (!instructions.some((line) => line.trim().length > 0)) {
			next.instructions = 'Add at least one instruction step.';
		}
		errors = next;
		return Object.keys(next).length === 0;
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!validate()) return;
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

<form onsubmit={handleSubmit} novalidate>
	<label>
		Title
		<input
			type="text"
			bind:value={title}
			class:invalid={!!errors.title}
			aria-invalid={!!errors.title}
		/>
		{#if errors.title}<p class="field-error">{errors.title}</p>{/if}
	</label>

	<label>
		Description
		<textarea bind:value={description} rows="2"></textarea>
	</label>

	<label>
		Author
		<input
			type="text"
			bind:value={author}
			class:invalid={!!errors.author}
			aria-invalid={!!errors.author}
		/>
		{#if errors.author}<p class="field-error">{errors.author}</p>{/if}
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
			<input
				type="number"
				min="1"
				bind:value={servings}
				class:invalid={!!errors.servings}
				aria-invalid={!!errors.servings}
			/>
			{#if errors.servings}<p class="field-error">{errors.servings}</p>{/if}
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
	{#if errors.instructions}<p class="field-error">{errors.instructions}</p>{/if}
	{#each instructions as _, index}
		<div class="instruction-row">
			<span class="step">{index + 1}.</span>
			<div class="reorder-btns">
				<button
					type="button"
					class="reorder"
					onclick={() => moveInstruction(index, -1)}
					disabled={index === 0}
					aria-label="Move step up"
				>
					↑
				</button>
				<button
					type="button"
					class="reorder"
					onclick={() => moveInstruction(index, 1)}
					disabled={index === instructions.length - 1}
					aria-label="Move step down"
				>
					↓
				</button>
			</div>
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
		font-size: 1rem;
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
		min-width: 0;
	}
	input.invalid {
		border-color: var(--bad);
	}
	.field-error {
		color: var(--bad);
		font-size: 0.78rem;
		margin: 0.15rem 0 0;
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
		min-width: 0;
	}
	.ingredient-row input {
		flex: 1;
		min-width: 0;
	}
	.ingredient-row select:last-of-type {
		flex: 1;
		min-width: 0;
	}
	.instruction-row textarea {
		flex: 1;
		min-width: 0;
	}
	.reorder-btns {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 0 0 auto;
	}
	.reorder {
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--paper-raised);
		color: var(--ink);
		font-size: 0.7rem;
		line-height: 1;
		padding: 0.15rem 0.35rem;
		cursor: pointer;
	}
	.reorder:disabled {
		opacity: 0.35;
		cursor: default;
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
