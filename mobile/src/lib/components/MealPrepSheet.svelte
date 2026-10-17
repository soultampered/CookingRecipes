<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { createFromRecipes, previewFromRecipes, type PlannedItem, type RecipeRequest } from '$lib/api/shoppingLists';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t, tRaw } from '$lib/i18n/index.svelte';
	import { formatQuantity } from '$lib/utils/quantity';
	import type { Recipe } from '$lib/types/recipe';
	import { activePantry } from '$lib/state/activePantry.svelte';

	// STO-80 (and reused by STO-87 with `initial`): batch several recipes into one list.
	let {
		recipes,
		initial = [],
		title,
		defaultName,
		onClose
	}: {
		recipes: Recipe[];
		initial?: RecipeRequest[];
		title?: string;
		defaultName?: string;
		onClose: () => void;
	} = $props();

	// Seeded once per open.
	let scales = $state<Record<string, number>>(untrack(() => Object.fromEntries(initial.map((r) => [r.recipeId, r.scale ?? 1]))));
	let name = $state(untrack(() => defaultName ?? t('mealPrep.defaultName')));
	let preview = $state<PlannedItem[]>([]);
	let creating = $state(false);

	let requests = $derived(Object.entries(scales).map(([recipeId, scale]) => ({ recipeId, scale })));
	let toBuy = $derived(preview.filter((p) => p.toBuy > 0));

	function toggle(id: string) {
		if (id in scales) {
			const { [id]: _, ...rest } = scales;
			scales = rest;
		} else {
			scales = { ...scales, [id]: 1 };
		}
	}

	function step(id: string, delta: number) {
		scales = { ...scales, [id]: Math.max(0.5, (scales[id] ?? 1) + delta) };
	}

	// Re-preview on every selection/scale change; latest request wins.
	let seq = 0;
	$effect(() => {
		const current = requests;
		const mine = ++seq;
		if (current.length === 0) {
			preview = [];
			return;
		}
		previewFromRecipes(current, activePantry.current)
			.then((p) => {
				if (mine === seq) preview = p;
			})
			.catch(() => {});
	});

	async function create() {
		if (!requests.length) {
			toast.push(t('mealPrep.pickSome'));
			return;
		}
		creating = true;
		try {
			const list = await createFromRecipes(requests, { name: name.trim() || undefined, householdId: activePantry.current });
			onClose();
			await goto(`/shopping-lists/${list._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('mealPrep.error'));
		} finally {
			creating = false;
		}
	}

	function qty(n: number, unit: string) {
		return `${formatQuantity(n)} ${tRaw('unit', unit)}`;
	}
</script>

<button type="button" class="backdrop" aria-label={t('common.cancel')} onclick={onClose} transition:fade={{ duration: 150 }}></button>
<div class="sheet" role="dialog" aria-modal="true" transition:fly={{ y: 400, duration: 220 }}>
	<h2>{title ?? t('mealPrep.title')}</h2>
	<p class="hint">{t('mealPrep.hint')}</p>

	<ul class="recipes">
		{#each recipes as r (r._id)}
			<li>
				<label>
					<input type="checkbox" checked={r._id in scales} onchange={() => toggle(r._id)} />
					<span>{r.title}</span>
				</label>
				{#if r._id in scales}
					<div class="stepper">
						<button type="button" onclick={() => step(r._id, -0.5)}>−</button>
						<span>×{formatQuantity(scales[r._id])}</span>
						<button type="button" onclick={() => step(r._id, 0.5)}>+</button>
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	{#if preview.length > 0}
		<ul class="preview">
			{#each preview as p (p.inventoryItemId)}
				<li class:covered={p.toBuy === 0}>
					<div class="p-name">
						<span>{p.name}{p.unitMismatch ? ' ⚠' : ''}</span>
						<span class="muted">
							{t('mealPrep.need', { needed: qty(p.needed, p.unit), have: qty(p.have, p.unit) })}
							{#if p.unitMismatch}· {t('mealPrep.mismatch')}{/if}
						</span>
					</div>
					<span class="buy">{p.toBuy > 0 ? t('mealPrep.buy', { amount: qty(p.toBuy, p.unit) }) : t('mealPrep.covered')}</span>
				</li>
			{/each}
		</ul>
		{#if toBuy.length === 0}<p class="hint">{t('mealPrep.nothingToBuy')}</p>{/if}
	{/if}

	<label class="name">
		{t('mealPrep.listName')}
		<input type="text" maxlength="200" bind:value={name} />
	</label>

	<div class="actions">
		<button type="button" class="outline" onclick={onClose}>{t('common.cancel')}</button>
		<button type="button" class="primary" disabled={creating || toBuy.length === 0} onclick={create}>
			{t('mealPrep.create', { count: toBuy.length })}
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
		max-height: 88vh;
		overflow-y: auto;
		max-width: 560px;
		margin: 0 auto;
		background: var(--paper-raised);
		border-radius: 16px 16px 0 0;
		padding: 1.1rem 1.1rem calc(1.1rem + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	h2 {
		margin: 0;
		font-size: var(--text-lg);
	}
	.hint,
	.muted {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--ink-soft);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.recipes li,
	.preview li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid var(--line);
	}
	.recipes label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}
	.stepper {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-variant-numeric: tabular-nums;
		font-size: var(--text-sm);
	}
	.stepper button {
		width: 1.8rem;
		height: 1.8rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--paper);
		color: var(--ink);
		cursor: pointer;
	}
	.preview {
		border-top: 2px solid var(--line);
	}
	.p-name {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.buy {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--accent);
		white-space: nowrap;
	}
	.preview li.covered .buy {
		color: var(--good);
		font-weight: 400;
	}
	.name {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: var(--text-sm);
	}
	.name input {
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
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
