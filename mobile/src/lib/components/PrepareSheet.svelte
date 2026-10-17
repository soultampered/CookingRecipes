<script lang="ts">
	import { untrack } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { prepareRecipe, type PrepareResult } from '$lib/api/recipes';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t, tRaw } from '$lib/i18n/index.svelte';
	import { formatQuantity, roundQuantity } from '$lib/utils/quantity';
	import { convert } from '$lib/utils/unitConversion';
	import type { Unit } from '$lib/types/unit';
	import type { Recipe } from '$lib/types/recipe';
	import type { Inventory } from '$lib/types/inventory';

	// STO-117: preview of exactly what Prepare deducts, editable per ingredient.
	let {
		recipe,
		scale,
		inventory,
		names,
		onClose,
		onPrepared
	}: {
		recipe: Recipe;
		scale: number;
		inventory: Record<string, Inventory>;
		names: Record<string, string>;
		onClose: () => void;
		onPrepared: (result: PrepareResult) => void;
	} = $props();

	// STO-92: amounts are entered in the *stock* unit (that's what gets deducted), converting
	// from the recipe's unit when the two are the same kind — fixes STO-117's unit bug.
	function stockUnitFor(i: number): Unit | undefined {
		return inventory[recipe.ingredients[i].inventoryItemId]?.unit ?? recipe.ingredients[i].unit;
	}
	function convertedFor(i: number): number | null {
		const ing = recipe.ingredients[i];
		const stockUnit = inventory[ing.inventoryItemId]?.unit;
		if (!ing.unit || !stockUnit || ing.unit === stockUnit) return null;
		return convert(ing.quantity * scale, ing.unit, stockUnit);
	}

	// Seeded once per open (the sheet is mounted fresh each time).
	let amounts = $state<number[]>(
		untrack(() => recipe.ingredients.map((ing, i) => roundQuantity(convertedFor(i) ?? ing.quantity * scale)))
	);
	let submitting = $state(false);

	// STO-86
	let saveLeftovers = $state(false);
	let leftoverServings = $state(1);
	let leftoverDays = $state(3);

	function stockOf(id: string) {
		return inventory[id]?.quantity;
	}

	let shortIndexes = $derived(
		recipe.ingredients
			.map((ing, i) => ({ i, have: stockOf(ing.inventoryItemId) }))
			.filter(({ i, have }) => have === undefined || amounts[i] > have)
			.map(({ i }) => i)
	);

	async function confirm() {
		submitting = true;
		try {
			const result = await prepareRecipe(recipe._id, {
				// scale still matters for the nutrition log (servings made), not the amounts.
				scale,
				leftovers: saveLeftovers
					? { servings: Math.max(0.5, Number(leftoverServings) || 1), expiresInDays: Math.max(0, Math.round(Number(leftoverDays) || 0)) }
					: undefined,
				overrides: recipe.ingredients.map((ing, i) => ({
					inventoryItemId: ing.inventoryItemId,
					quantity: Math.max(0, Number(amounts[i]) || 0)
				}))
			});
			onPrepared(result);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('recipeDetail.errorPrepare'));
		} finally {
			submitting = false;
		}
	}
</script>

<button
	type="button"
	class="backdrop"
	aria-label={t('common.cancel')}
	onclick={onClose}
	transition:fade={{ duration: 150 }}
></button>
<div class="sheet" role="dialog" aria-modal="true" transition:fly={{ y: 400, duration: 220 }}>
	<h2>{t('prepareSheet.title', { title: recipe.title })}</h2>
	<p class="hint">{t('prepareSheet.hint')}</p>

	<ul>
		{#each recipe.ingredients as ing, i (i)}
			{@const stock = inventory[ing.inventoryItemId]}
			<li class:short={shortIndexes.includes(i)}>
				<div class="name">
					<span>{names[ing.inventoryItemId] ?? t('recipeDetail.unknownIngredient')}</span>
					<span class="meta">
						{#if !stock}
							{t('prepareSheet.notInInventory')}
						{:else}
							{t('prepareSheet.have', {
								amount: `${formatQuantity(stock.quantity)} ${tRaw('unit', stock.unit)}`
							})}
							{#if ing.unit && ing.unit !== stock.unit}
								{#if convertedFor(i) !== null}
									· {t('prepareSheet.converted', {
										amount: `${formatQuantity(ing.quantity * scale)} ${tRaw('unit', ing.unit)}`
									})}
								{:else}
									· {t('prepareSheet.unitDiffers', { unit: tRaw('unit', stock.unit) })}
								{/if}
							{/if}
						{/if}
					</span>
				</div>
				<label class="amount">
					<input
						type="number"
						inputmode="decimal"
						min="0"
						step="any"
						bind:value={amounts[i]}
						aria-label={t('prepareSheet.amountAria', { name: names[ing.inventoryItemId] ?? '' })}
					/>
					<span>{stockUnitFor(i) ? tRaw('unit', stockUnitFor(i)!) : ''}</span>
				</label>
			</li>
		{/each}
	</ul>

	<label class="leftover-toggle">
		<input type="checkbox" bind:checked={saveLeftovers} />
		{t('prepareSheet.saveLeftovers')}
	</label>
	{#if saveLeftovers}
		<div class="leftover-fields">
			<label>
				{t('prepareSheet.leftoverServings')}
				<input type="number" inputmode="decimal" min="0.5" step="0.5" bind:value={leftoverServings} />
			</label>
			<label>
				{t('prepareSheet.keepsDays')}
				<input type="number" inputmode="numeric" min="0" max="60" bind:value={leftoverDays} />
			</label>
		</div>
	{/if}

	{#if shortIndexes.length > 0}
		<p class="warning">{t('prepareSheet.shortWarning')}</p>
	{/if}

	<div class="actions">
		<button type="button" class="outline" onclick={onClose} disabled={submitting}>{t('common.cancel')}</button>
		<button type="button" class="primary" onclick={confirm} disabled={submitting || shortIndexes.length > 0}>
			{submitting ? t('recipeDetail.preparing') : t('prepareSheet.confirm')}
		</button>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 90;
		border: none;
		background: rgba(0, 0, 0, 0.45);
	}
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 95;
		max-height: 85vh;
		overflow-y: auto;
		background: var(--paper-raised);
		border-radius: 16px 16px 0 0;
		padding: 1.1rem 1.1rem calc(1.1rem + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		max-width: 560px;
		margin: 0 auto;
	}
	h2 {
		margin: 0;
		font-size: var(--text-lg);
	}
	.hint {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--ink-soft);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--line);
	}
	li.short .meta {
		color: var(--bad);
	}
	.name {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.meta {
		font-size: var(--text-xs);
		color: var(--ink-soft);
	}
	.amount {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: var(--text-sm);
		flex: 0 0 auto;
	}
	.amount input {
		width: 5rem;
		padding: 0.35rem 0.4rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		text-align: right;
	}
	li.short .amount input {
		border-color: var(--bad);
	}
	.leftover-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.leftover-fields {
		display: flex;
		gap: 0.6rem;
	}
	.leftover-fields label {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: var(--text-xs);
		color: var(--ink-soft);
	}
	.leftover-fields input {
		padding: 0.4rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
	}
	.warning {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--bad);
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	.actions button {
		flex: 1;
		padding: 0.7rem;
		border-radius: 10px;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.outline {
		border: 1px solid var(--line);
		background: var(--paper-raised);
		color: var(--ink);
	}
	.primary {
		border: none;
		background: var(--accent);
		color: var(--paper-raised);
	}
	.primary:disabled {
		opacity: 0.5;
	}
</style>
