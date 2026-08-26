<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { deleteRecipe, getMissingIngredients, prepareRecipe } from '$lib/api/recipes';
	import { listShoppingLists, addItem } from '$lib/api/shoppingLists';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import StepTimer from '$lib/components/StepTimer.svelte';
	import { parseDurationSeconds } from '$lib/utils/parseDuration';
	import { t, tRaw } from '$lib/i18n/index.svelte';
	import type { MissingIngredient } from '$lib/types/recipe';
	import type { ShoppingList } from '$lib/types/shoppingList';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let preparing = $state(false);
	let deleting = $state(false);
	let confirmingDelete = $state(false);
	let missing = $state<MissingIngredient[] | null>(null);

	let addingMissingToList = $state(false);
	let shoppingLists = $state<ShoppingList[] | null>(null);
	let loadingLists = $state(false);
	let addingListId = $state<string | null>(null);

	async function openAddMissingToList() {
		addingMissingToList = true;
		if (!shoppingLists) {
			loadingLists = true;
			try {
				shoppingLists = await listShoppingLists();
			} catch (err) {
				toast.push(err instanceof ApiError ? err.message : t('recipeDetail.errorLoadLists'));
				addingMissingToList = false;
			} finally {
				loadingLists = false;
			}
		}
	}

	async function addMissingToList(listId: string) {
		if (!missing) return;
		addingListId = listId;
		try {
			await Promise.all(
				missing.map((item) => addItem(listId, { name: item.name, quantity: item.needed }))
			);
			toast.push(t('recipeDetail.addedMissingToList'), 'info');
			addingMissingToList = false;
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('recipeDetail.errorAddToList'));
		} finally {
			addingListId = null;
		}
	}

	// STO-65: "have I gathered this from my kitchen for this recipe" — a per-visit cooking
	// aid, deliberately not persisted or tied to the shopping-list checked concept at all.
	let gathered = $state<Set<number>>(new Set());

	function toggleGathered(index: number) {
		const next = new Set(gathered);
		if (next.has(index)) next.delete(index);
		else next.add(index);
		gathered = next;
	}

	let instructionSteps = $derived(
		data.recipe.instructions.map((text) => ({ text, duration: parseDurationSeconds(text) }))
	);

	function inventoryName(id: string) {
		return data.inventoryNames[id] ?? t('recipeDetail.unknownIngredient');
	}

	async function handlePrepare() {
		preparing = true;
		missing = null;
		try {
			await prepareRecipe(data.recipe._id);
			toast.push(t('recipeDetail.prepared'), 'info');
			await invalidate(`app:recipe:${data.recipe._id}`);
		} catch (err) {
			try {
				missing = await getMissingIngredients(data.recipe._id);
			} catch {
				toast.push(err instanceof ApiError ? err.message : t('recipeDetail.errorPrepare'));
			}
		} finally {
			preparing = false;
		}
	}

	async function confirmDelete() {
		deleting = true;
		try {
			await deleteRecipe(data.recipe._id);
			await goto('/recipes');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('recipeDetail.errorDelete'));
			deleting = false;
			confirmingDelete = false;
		}
	}
</script>

<div class="page">
	<a class="back" href="/recipes">{t('recipeDetail.back')}</a>
	<div class="header">
		<div>
			<h1>{data.recipe.title}</h1>
			<div class="meta">
				<span class="pill pill-{data.recipe.difficulty}">{tRaw('difficulty', data.recipe.difficulty)}</span>
				{#if data.recipe.totalTimeMinutes}<span>{t('recipes.minutes', { count: data.recipe.totalTimeMinutes })}</span>{/if}
				{#if data.recipe.servings}<span>{t('recipes.servesCount', { count: data.recipe.servings })}</span>{/if}
			</div>
		</div>
		<a href={`/recipes/${data.recipe._id}/edit`} class="btn-outline">{t('recipeDetail.edit')}</a>
	</div>

	{#if data.recipe.description}
		<p class="description">{data.recipe.description}</p>
	{/if}

	<div class="field-label ingredients-label">
		<span>{t('recipeDetail.ingredients')}</span>
		{#if data.recipe.ingredients.length > 0}
			<span class="gathered-count">
				{t('recipeDetail.gatheredCount', {
					done: gathered.size,
					total: data.recipe.ingredients.length
				})}
			</span>
		{/if}
	</div>
	<div class="ingredients">
		{#each data.recipe.ingredients as ingredient, i}
			<button
				type="button"
				class="ingredient-row"
				class:gathered={gathered.has(i)}
				onclick={() => toggleGathered(i)}
			>
				<span class="ingredient-check" aria-hidden="true">{gathered.has(i) ? '✓' : ''}</span>
				<span class="ingredient-text">{inventoryName(ingredient.inventoryItemId)}</span>
				<span class="qty">{ingredient.quantity}{ingredient.unit ? ` ${tRaw('unit', ingredient.unit)}` : ''}</span>
			</button>
		{/each}
	</div>

	<div class="field-label">{t('recipeDetail.instructions')}</div>
	<ol class="instructions">
		{#each instructionSteps as step}
			<li>
				{step.text}
				{#if step.duration !== null}
					<StepTimer seconds={step.duration} />
				{/if}
			</li>
		{/each}
	</ol>

	<button type="button" class="primary" onclick={handlePrepare} disabled={preparing}>
		{preparing ? t('recipeDetail.preparing') : t('recipeDetail.prepare')}
	</button>

	{#if missing && missing.length > 0}
		<div class="banner">
			<strong>
				{t(missing.length === 1 ? 'recipeDetail.cantPrepare_one' : 'recipeDetail.cantPrepare_other', {
					count: missing.length
				})}
			</strong>
			{#each missing as item}
				<div>{item.name} ({item.needed}{item.unit ? ` ${tRaw('unit', item.unit)}` : ''})</div>
			{/each}
			<button type="button" class="add-missing-btn" onclick={openAddMissingToList}>
				{t('recipeDetail.addMissingToList')}
			</button>
		</div>
	{/if}

	<div class="danger-zone">
		<button type="button" class="danger-link" onclick={() => (confirmingDelete = true)}>
			{t('recipeDetail.deleteRecipe')}
		</button>
	</div>
</div>

{#if addingMissingToList}
	<div
		class="backdrop"
		role="presentation"
		onclick={() => (addingMissingToList = false)}
		onkeydown={(e) => e.key === 'Escape' && (addingMissingToList = false)}
	>
		<div
			class="picker"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h2>{t('recipeDetail.addMissingToListTitle')}</h2>
			{#if loadingLists}
				<p class="hint">{t('inventory.loadingLists')}</p>
			{:else if !shoppingLists || shoppingLists.length === 0}
				<p class="hint">{t('inventory.noLists')}</p>
			{:else}
				<div class="list-options">
					{#each shoppingLists as list (list._id)}
						<button
							type="button"
							class="list-option"
							onclick={() => addMissingToList(list._id!)}
							disabled={addingListId === list._id}
						>
							{addingListId === list._id ? t('common.adding') : list.name}
						</button>
					{/each}
				</div>
			{/if}
			<button type="button" class="outline" onclick={() => (addingMissingToList = false)}>
				{t('common.cancel')}
			</button>
		</div>
	</div>
{/if}

<ConfirmModal
	open={confirmingDelete}
	title={t('recipeDetail.deleteTitle')}
	message={t('recipeDetail.deleteMessage', { title: data.recipe.title })}
	confirmLabel={t('recipeDetail.deleteRecipe')}
	confirmingLabel={t('common.deleting')}
	cancelLabel={t('common.cancel')}
	confirming={deleting}
	onConfirm={confirmDelete}
	onCancel={() => (confirmingDelete = false)}
/>

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.back {
		align-self: flex-start;
		font-size: 0.85rem;
		color: var(--accent);
		text-decoration: none;
	}
	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
	}
	h1 {
		margin: 0 0 0.2rem;
	}
	.meta {
		display: flex;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--ink-soft);
	}
	.pill {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		text-transform: capitalize;
	}
	.pill-easy {
		background: var(--good-soft);
		color: var(--good);
	}
	.pill-medium {
		background: var(--warn-soft);
		color: var(--warn);
	}
	.pill-hard {
		background: var(--bad-soft);
		color: var(--bad);
	}
	.description {
		color: var(--ink-soft);
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.field-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
	}
	.ingredients-label {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.gathered-count {
		font-variant-numeric: tabular-nums;
		text-transform: none;
	}
	.ingredients {
		display: flex;
		flex-direction: column;
	}
	.ingredient-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		border: none;
		background: none;
		text-align: left;
		font-size: 0.9rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid var(--line);
		color: inherit;
		cursor: pointer;
	}
	.ingredient-check {
		flex: 0 0 auto;
		width: 1.2rem;
		height: 1.2rem;
		border: 1px solid var(--line);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		color: var(--paper-raised);
	}
	.ingredient-row.gathered .ingredient-check {
		background: var(--accent);
		border-color: var(--accent);
	}
	.ingredient-text {
		flex: 1;
		min-width: 0;
	}
	.ingredient-row.gathered .ingredient-text {
		color: var(--ink-soft);
		text-decoration: line-through;
	}
	.qty {
		color: var(--ink-soft);
	}
	.instructions {
		padding-left: 1.1rem;
		font-size: 0.9rem;
		line-height: 1.6;
	}
	.instructions li {
		margin-bottom: 0.4rem;
	}
	.btn-outline {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		text-decoration: none;
		color: var(--ink);
		background: var(--paper-raised);
		flex: 0 0 auto;
	}
	.primary {
		padding: 0.75rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
		cursor: pointer;
	}
	.danger-zone {
		margin-top: 0.6rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--line);
		display: flex;
	}
	.danger-link {
		border: none;
		background: none;
		color: var(--bad);
		font-size: 0.85rem;
		text-decoration: underline;
		cursor: pointer;
		padding: 0;
	}
	.banner {
		background: var(--bad-soft);
		color: var(--bad);
		border-radius: 8px;
		padding: 0.7rem 0.8rem;
		font-size: 0.85rem;
		line-height: 1.5;
	}
	.banner strong {
		display: block;
		margin-bottom: 0.2rem;
	}
	.add-missing-btn {
		margin-top: 0.6rem;
		padding: 0.5rem 0.8rem;
		border-radius: 8px;
		border: 1px solid var(--bad);
		background: var(--paper-raised);
		color: var(--bad);
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.25rem;
		z-index: 100;
	}
	.picker {
		width: 100%;
		max-width: 340px;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.picker h2 {
		margin: 0;
		font-size: 1rem;
	}
	.list-options {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.list-option {
		text-align: left;
		padding: 0.6rem 0.7rem;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--paper);
		color: var(--ink);
		cursor: pointer;
	}
	.picker .outline {
		padding: 0.6rem;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--paper-raised);
		color: var(--ink);
		font-weight: 600;
		cursor: pointer;
	}
</style>
