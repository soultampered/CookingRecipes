<script lang="ts">
	import { writes } from '$lib/state/writes.svelte';
	import { features } from '$lib/state/features.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { addToMealPlan, removeFromMealPlan, type MealSlot, MEAL_SLOTS } from '$lib/api/mealPlan';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t, locale } from '$lib/i18n/index.svelte';
	import { addDays, fromLocalISODate, toLocalISODate } from '$lib/utils/dates';
	import SlotChips from '$lib/components/SlotChips.svelte';
	import PullToRefresh from '$lib/components/PullToRefresh.svelte';
	import MealPrepSheet from '$lib/components/MealPrepSheet.svelte';
	import type { PageProps } from './$types';

	// The week's planned recipes, Mon–Sun.
	let { data }: PageProps = $props();

	let start = $derived(fromLocalISODate(data.from));
	let days = $derived(Array.from({ length: 7 }, (_, i) => toLocalISODate(addDays(start, i))));
	let todayIso = toLocalISODate(new Date());

	function slotRank(s?: MealSlot) {
		return s ? MEAL_SLOTS.indexOf(s) : MEAL_SLOTS.length;
	}
	function entriesFor(date: string) {
		return data.entries.filter((e) => e.date === date).sort((a, b) => slotRank(a.slot) - slotRank(b.slot));
	}
	function dayLabel(iso: string) {
		return fromLocalISODate(iso).toLocaleDateString(locale.current, { weekday: 'long', month: 'short', day: 'numeric' });
	}
	function shiftWeek(n: number) {
		goto(`/meal-plan?week=${toLocalISODate(addDays(start, n * 7))}`);
	}

	// Prefill meal prep with the week (repeats add up).
	let showShopping = $state(false);
	let weekRequests = $derived.by(() => {
		const scales = new Map<string, number>();
		for (const e of data.entries) {
			const recipe = data.recipes.find((r) => r._id === e.recipeId);
			const scale = e.servings && recipe?.servings ? e.servings / recipe.servings : 1;
			scales.set(e.recipeId, (scales.get(e.recipeId) ?? 0) + scale);
		}
		return [...scales].map(([recipeId, scale]) => ({ recipeId, scale }));
	});
	let weekRecipes = $derived(data.recipes.filter((r) => weekRequests.some((w) => w.recipeId === r._id)));

	function shortDate(iso: string) {
		return fromLocalISODate(iso).toLocaleDateString(locale.current, { month: 'short', day: 'numeric' });
	}

	let pickingDate = $state<string | null>(null);
	let search = $state('');
	let slot = $state<MealSlot | null>('dinner');
	let matches = $derived(
		data.recipes.filter((r) => r.title.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 30)
	);

	async function pick(recipeId: string) {
		if (!pickingDate) return;
		try {
			await addToMealPlan({ date: pickingDate, recipeId, slot: slot ?? undefined });
			pickingDate = null;
			search = '';
			await invalidate('app:meal-plan');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('mealPlan.error'));
		}
	}

	async function remove(id: string) {
		try {
			await removeFromMealPlan(id);
			await invalidate('app:meal-plan');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('mealPlan.error'));
		}
	}
</script>

<PullToRefresh dependency="app:meal-plan">
	<div class="page">
		<a class="back" href="/dashboard">‹ {t('dashboard.title')}</a>
		<div class="header">
			<h1>{t('mealPlan.title')}</h1>
		</div>
		{#if data.entries.length > 0}
			{#if writes.allowed && features.has('mealPrep')}<button type="button" class="shop" onclick={() => (showShopping = true)}>{t('mealPlan.shoppingList')}</button>{/if}
		{/if}
		<div class="week-nav">
			<button type="button" onclick={() => shiftWeek(-1)}>{t('mealPlan.prevWeek')}</button>
			<button type="button" class="this-week" onclick={() => goto('/meal-plan')}>{t('mealPlan.thisWeek')}</button>
			<button type="button" onclick={() => shiftWeek(1)}>{t('mealPlan.nextWeek')}</button>
		</div>

		{#each days as day (day)}
			<section class="day" class:today={day === todayIso}>
				<div class="day-head">
					<span class="day-name">{dayLabel(day)}</span>
					{#if writes.allowed}<button type="button" class="add" onclick={() => (pickingDate = day)}>{t('mealPlan.add')}</button>{/if}
				</div>
				{#if entriesFor(day).length === 0}
					<p class="muted">{t('mealPlan.nothing')}</p>
				{:else}
					<ul>
						{#each entriesFor(day) as entry (entry._id)}
							<li>
								{#if entry.slot}<span class="slot">{t(`mealPlan.slot.${entry.slot}`)}</span>{/if}
								<a href={`/recipes/${entry.recipeId}`}>{entry.recipeTitle}</a>
								<button
									type="button"
									class="remove"
									hidden={!writes.allowed}
									aria-label={t('mealPlan.removeAria', { title: entry.recipeTitle, day: dayLabel(day) })}
									onclick={() => remove(entry._id)}
								>
									×
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/each}
	</div>
</PullToRefresh>

{#if showShopping}
	<MealPrepSheet
		recipes={weekRecipes}
		initial={weekRequests}
		title={t('mealPlan.shoppingListTitle')}
		defaultName={t('mealPlan.listName', { from: shortDate(data.from), to: shortDate(data.to) })}
		onClose={() => (showShopping = false)}
	/>
{/if}

{#if pickingDate}
	<div class="backdrop" role="presentation" onclick={() => (pickingDate = null)} onkeydown={(e) => e.key === 'Escape' && (pickingDate = null)}>
		<div class="picker" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<h2>{t('mealPlan.pickRecipe')} · {dayLabel(pickingDate)}</h2>
			<SlotChips bind:value={slot} />
			<input type="search" placeholder={t('mealPlan.search')} bind:value={search} />
			<ul class="matches">
				{#each matches as r (r._id)}
					<li><button type="button" onclick={() => pick(r._id)}>{r.title}</button></li>
				{/each}
			</ul>
			<button type="button" class="cancel" onclick={() => (pickingDate = null)}>{t('common.cancel')}</button>
		</div>
	</div>
{/if}

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	.back {
		color: var(--accent);
		text-decoration: none;
		font-size: var(--text-sm);
	}
	h1 {
		margin: 0;
	}
	.shop {
		border: none;
		border-radius: 10px;
		background: var(--accent);
		color: var(--paper-raised);
		font: inherit;
		font-weight: 600;
		padding: 0.6rem;
		cursor: pointer;
	}
	.week-nav {
		display: flex;
		justify-content: space-between;
		gap: 0.4rem;
	}
	.week-nav button {
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
		font-size: var(--text-sm);
		padding: 0.35rem 0.7rem;
		cursor: pointer;
	}
	.day {
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--paper-raised);
		padding: 0.6rem 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.day.today {
		border-color: var(--accent);
	}
	.day-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.day-name {
		font-weight: 600;
		font-size: var(--text-sm);
	}
	.add {
		border: none;
		background: none;
		color: var(--accent);
		font: inherit;
		font-size: var(--text-sm);
		cursor: pointer;
	}
	.muted {
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
		gap: 0.25rem;
	}
	li {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}
	li a {
		flex: 1;
		min-width: 0;
		color: var(--ink);
		text-decoration: none;
	}
	.slot {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.05rem 0.4rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
	}
	.remove {
		border: none;
		background: none;
		color: var(--bad);
		font-size: 1.1rem;
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
		max-width: 380px;
		max-height: 80vh;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.picker h2 {
		margin: 0;
		font-size: 1rem;
	}
	.picker input {
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
	}
	.matches {
		overflow-y: auto;
		max-height: 40vh;
	}
	.matches button {
		width: 100%;
		text-align: left;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		padding: 0.5rem 0.6rem;
		cursor: pointer;
	}
	.cancel {
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
		font-weight: 600;
		padding: 0.55rem;
		cursor: pointer;
	}
</style>
