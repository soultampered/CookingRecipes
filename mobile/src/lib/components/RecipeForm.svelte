<script lang="ts">
	import type { DifficultyLevel, NewRecipe, RecipeIngredient } from '$lib/types/recipe';
	import type { Inventory } from '$lib/types/inventory';
	import { UNITS } from '$lib/types/unit';
	import { t, tRaw } from '$lib/i18n/index.svelte';
	import { flip } from 'svelte/animate';
	import { dragToReorder } from '$lib/utils/dragToReorder.svelte';

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
	// Stable per-row ids for keyed reordering (drag AND the existing up/down buttons both need
	// this — a plain string[] keyed by index would make Svelte reuse/mismatch DOM nodes across
	// a reorder instead of animating them, and the drag composable needs a stable id to attach
	// its DOM refs/gesture state to per row) — never sent to the API, only `instructionTexts`
	// (below) is.
	function makeInstructionId() {
		return crypto.randomUUID();
	}
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
	let instructionRows = $state(initialInstructions.map((text) => ({ id: makeInstructionId(), text })));
	let ingredients = $state<RecipeIngredient[]>(initialIngredients);

	// Every other field/function below keeps referring to `instructions` as a plain string[],
	// same as before — only the mutation functions (add/remove/move/reorder) and the template's
	// {#each} need to know about the row ids underneath.
	let instructions = $derived(instructionRows.map((row) => row.text));

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

	const instructionDrag = dragToReorder();

	function reorderInstructions(fromIndex: number, toIndex: number) {
		const copy = [...instructionRows];
		const [moved] = copy.splice(fromIndex, 1);
		copy.splice(toIndex, 0, moved);
		instructionRows = copy;
	}

	function addIngredient() {
		if (!inventoryItems.length) return;
		ingredients.push({ inventoryItemId: inventoryItems[0]._id, quantity: 1, unit: inventoryItems[0].unit });
	}

	function removeIngredient(index: number) {
		ingredients = ingredients.filter((_, i) => i !== index);
	}

	function addInstruction() {
		instructionRows.push({ id: makeInstructionId(), text: '' });
	}

	function removeInstruction(index: number) {
		instructionRows = instructionRows.filter((_, i) => i !== index);
	}

	function inventoryName(id: string) {
		return inventoryItems.find((i) => i._id === id)?.name ?? id;
	}

	function registerInstructionRef(node: HTMLElement, id: string) {
		instructionDrag.registerRef(id, node);
		return {
			destroy() {
				instructionDrag.registerRef(id, null);
			}
		};
	}

	let errors = $state<{ title?: string; author?: string; servings?: string; instructions?: string }>(
		{}
	);

	function validate(): boolean {
		const next: typeof errors = {};
		if (!title.trim()) next.title = t('recipeForm.titleRequired');
		if (!author.trim()) next.author = t('recipeForm.authorRequired');
		if (!servings || servings < 1) next.servings = t('recipeForm.servingsRequired');
		if (!instructions.some((line) => line.trim().length > 0)) {
			next.instructions = t('recipeForm.instructionsRequired');
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
		{t('recipeForm.title')}
		<input
			type="text"
			bind:value={title}
			class:invalid={!!errors.title}
			aria-invalid={!!errors.title}
		/>
		{#if errors.title}<p class="field-error">{errors.title}</p>{/if}
	</label>

	<label>
		{t('recipeForm.description')}
		<textarea bind:value={description} rows="2"></textarea>
	</label>

	<label>
		{t('recipeForm.author')}
		<input
			type="text"
			bind:value={author}
			class:invalid={!!errors.author}
			aria-invalid={!!errors.author}
		/>
		{#if errors.author}<p class="field-error">{errors.author}</p>{/if}
	</label>

	<div class="field-label">{t('recipeForm.difficulty')}</div>
	<div class="chiprow">
		{#each ['easy', 'medium', 'hard'] as const as level}
			<button
				type="button"
				class="chip"
				class:active={difficulty === level}
				onclick={() => (difficulty = level)}
			>
				{tRaw('difficulty', level)}
			</button>
		{/each}
	</div>

	<div class="row">
		<label>
			{t('recipeForm.servings')}
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
			{t('recipeForm.prepMinutes')}
			<input type="number" min="0" bind:value={prepTimeMinutes} />
		</label>
		<label>
			{t('recipeForm.cookMinutes')}
			<input type="number" min="0" bind:value={cookTimeMinutes} />
		</label>
	</div>

	<div class="field-label">{t('recipeForm.ingredients')}</div>
	{#if inventoryItems.length === 0}
		<p class="hint">{t('recipeForm.noInventoryHint')}</p>
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
					<option value={unit}>{tRaw('unit', unit)}</option>
				{/each}
			</select>
			<button type="button" class="remove" onclick={() => removeIngredient(index)}>×</button>
		</div>
	{/each}
	<button type="button" class="link" onclick={addIngredient} disabled={!inventoryItems.length}>
		{t('recipeForm.addIngredient')}
	</button>

	<div class="field-label">{t('recipeForm.instructions')}</div>
	{#if errors.instructions}<p class="field-error">{errors.instructions}</p>{/if}
	{#each instructionRows as row, index (row.id)}
		<div
			class="instruction-row"
			class:dragging={instructionDrag.isDragging(row.id)}
			use:registerInstructionRef={row.id}
			style:transform={`translateY(${instructionDrag.offsetFor(row.id)}px)`}
			animate:flip={{ duration: instructionDrag.isDragging(row.id) ? 0 : 200 }}
		>
			<span class="step">{index + 1}.</span>
			<button
				type="button"
				class="drag-handle"
				aria-label={t('recipeForm.dragToReorder')}
				onpointerdown={(e) => instructionDrag.onPointerDown(e, row.id)}
				onpointermove={(e) =>
					instructionDrag.onPointerMove(
						e,
						row.id,
						instructionRows.map((r) => r.id),
						reorderInstructions
					)}
				onpointerup={() => instructionDrag.onPointerUp(row.id)}
				onpointercancel={() => instructionDrag.cancel()}
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
					<circle cx="9" cy="6" r="1.8" />
					<circle cx="15" cy="6" r="1.8" />
					<circle cx="9" cy="12" r="1.8" />
					<circle cx="15" cy="12" r="1.8" />
					<circle cx="9" cy="18" r="1.8" />
					<circle cx="15" cy="18" r="1.8" />
				</svg>
			</button>
			<textarea bind:value={row.text} rows="2"></textarea>
			<button type="button" class="remove" onclick={() => removeInstruction(index)}>×</button>
		</div>
	{/each}
	<button type="button" class="link" onclick={addInstruction}>{t('recipeForm.addStep')}</button>

	<button type="submit" class="primary" disabled={submitting}>
		{submitting ? t('common.saving') : submitLabel}
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
	.instruction-row {
		position: relative;
		background: var(--paper);
		border-radius: 8px;
	}
	.instruction-row.dragging {
		z-index: 10;
		background: var(--paper-raised);
		box-shadow: 0 6px 16px -4px rgba(0, 0, 0, 0.35);
	}
	.drag-handle {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.2rem;
		height: 2.2rem;
		border: none;
		background: none;
		color: var(--ink-soft);
		cursor: grab;
		touch-action: none;
	}
	.instruction-row.dragging .drag-handle {
		cursor: grabbing;
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
