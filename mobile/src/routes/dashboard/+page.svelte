<script lang="ts">
	import { t } from '$lib/i18n/index.svelte';
	import { onboarding } from '$lib/state/onboarding.svelte';
	import OnboardingWalkthrough from '$lib/components/OnboardingWalkthrough.svelte';
	import { expirySettings } from '$lib/state/expirySettings.svelte';
	import { daysUntil, expiringItems } from '$lib/utils/expiry';
	import { features } from '$lib/state/features.svelte';
	import { toLocalISODate } from '$lib/utils/dates';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let todayPlanned = $derived(data.mealPlan.filter((e) => e.date === toLocalISODate(new Date())));
	let expiring = $derived(expiringItems(data.inventory, expirySettings.daysAhead));

	function expiryLabel(iso: string) {
		const days = daysUntil(iso);
		if (days < 0) return t('dashboard.expiredAgo');
		if (days === 0) return t('dashboard.expiredToday');
		return t('dashboard.expiresInDays', { count: days });
	}

	let outOfStockCount = $derived(data.inventory.filter((i) => i.quantity === 0).length);
	let uncheckedCount = $derived(
		data.shoppingLists.reduce(
			(total, list) => total + list.items.filter((i) => !i.checked).length,
			0
		)
	);
</script>

{#if onboarding.restored && !onboarding.seen}
	<OnboardingWalkthrough />
{/if}

<div class="page">
	<h1>{t('dashboard.title')}</h1>

	<a class="card" href="/recipes">
		<div class="card-header">
			<span class="card-title">{t('dashboard.recipes')}</span>
			<span class="stat">{data.recipes.length}</span>
		</div>
		{#if data.recipes.length === 0}
			<p class="empty">{t('dashboard.noRecipes')}</p>
		{:else}
			<p class="preview">
				{data.recipes
					.slice(0, 3)
					.map((r) => r.title)
					.join(' · ')}
			</p>
		{/if}
	</a>

	<a class="card" href="/recipes/suggestions">
		<div class="card-header">
			<span class="card-title">{t('dashboard.suggestions')}</span>
			<span class="stat">{data.suggestions.length}</span>
		</div>
		{#if data.suggestions.length === 0}
			<p class="empty">{t('dashboard.noSuggestions')}</p>
		{:else}
			<p class="preview">
				{data.suggestions
					.slice(0, 3)
					.map((r) => r.title)
					.join(' · ')}
			</p>
		{/if}
	</a>

	<a class="card" href="/inventory">
		<div class="card-header">
			<span class="card-title">{t('dashboard.inventory')}</span>
			<span class="stat">{data.inventory.length}</span>
		</div>
		{#if data.inventory.length === 0}
			<p class="empty">{t('dashboard.noInventory')}</p>
		{:else if outOfStockCount > 0}
			<p class="preview warn">
				{t(outOfStockCount === 1 ? 'dashboard.outOfStock_one' : 'dashboard.outOfStock_other', {
					count: outOfStockCount
				})}
			</p>
		{:else}
			<p class="preview good">{t('dashboard.allStocked')}</p>
		{/if}
	</a>

	<a class="card" href="/meal-plan">
		<div class="card-header">
			<span class="card-title">{t('dashboard.mealPlan')}</span>
			<span class="stat">{data.mealPlan.length}</span>
		</div>
		{#if data.mealPlan.length === 0}
			<p class="empty">{t('dashboard.noMealPlan')}</p>
		{:else if todayPlanned.length > 0}
			<p class="preview">{t('dashboard.todayPlanned', { titles: todayPlanned.map((e) => e.recipeTitle).join(' · ') })}</p>
		{/if}
	</a>

	{#if features.has('expiryAlerts')}
		<a class="card" href="/inventory?expiring=1">
			<div class="card-header">
				<span class="card-title">{t('dashboard.expiringSoon')}</span>
				<span class="stat" class:stat-warn={expiring.length > 0}>{expiring.length}</span>
			</div>
			{#if expiring.length === 0}
				<p class="empty">{t('dashboard.noExpiring', { days: expirySettings.daysAhead })}</p>
			{:else}
				<ul class="expiring-list">
					{#each expiring.slice(0, 3) as item (item._id)}
						<li class:expired={daysUntil(item.expirationDte!) < 0}>
							<span>{item.name}</span>
							<span class="when">{expiryLabel(item.expirationDte!)}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</a>
	{/if}

	{#if features.has('restock')}
		<a class="card" href="/inventory">
			<div class="card-header">
				<span class="card-title">{t('dashboard.runningOut')}</span>
				<span class="stat" class:stat-warn={data.restock.length > 0}>{data.restock.length}</span>
			</div>
			{#if data.restock.length === 0}
				<p class="empty">{t('dashboard.noRunningOut')}</p>
			{:else}
				<ul class="expiring-list">
					{#each data.restock.slice(0, 3) as p (p.itemId)}
						<li>
							<span>{p.name}</span>
							<span class="when">{t('dashboard.daysLeft', { count: Math.max(0, Math.round(p.daysLeft)) })}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</a>
	{/if}

	{#if features.has('nutrition')}
		<a class="card" href="/nutrition">
			<div class="card-header">
				<span class="card-title">{t('dashboard.nutritionToday')}</span>
				{#if data.nutritionToday}
					<span class="stat">{Math.round(data.nutritionToday.calories)}</span>
				{/if}
			</div>
			{#if !data.nutritionToday || data.nutritionToday.preparations.length === 0}
				<p class="empty">{t('dashboard.noNutrition')}</p>
			{:else}
				<p class="preview">
					{t('nutrition.macros', {
						protein: Math.round(data.nutritionToday.protein),
						carbs: Math.round(data.nutritionToday.carbs),
						fat: Math.round(data.nutritionToday.fat)
					})}
				</p>
			{/if}
		</a>
	{/if}

	<a class="card" href="/shopping-lists">
		<div class="card-header">
			<span class="card-title">{t('dashboard.shoppingLists')}</span>
			<span class="stat">{data.shoppingLists.length}</span>
		</div>
		{#if data.shoppingLists.length === 0}
			<p class="empty">{t('dashboard.noLists')}</p>
		{:else if uncheckedCount > 0}
			<p class="preview warn">
				{t(uncheckedCount === 1 ? 'dashboard.leftToGet_one' : 'dashboard.leftToGet_other', {
					count: uncheckedCount
				})}
			</p>
		{:else}
			<p class="preview good">{t('dashboard.allCaughtUp')}</p>
		{/if}
	</a>
</div>

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.card {
		display: block;
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1rem 1.1rem;
		text-decoration: none;
		color: inherit;
		background: var(--paper-raised);
	}
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.card-title {
		font-weight: 600;
		font-size: 1rem;
	}
	.stat {
		font-size: 1.4rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--accent);
	}
	.stat-warn {
		color: var(--warn);
	}
	.expiring-list {
		list-style: none;
		margin: 0.4rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: var(--text-sm);
	}
	.expiring-list li {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.expiring-list .when {
		color: var(--warn);
		font-weight: 600;
	}
	.expiring-list li.expired .when {
		color: var(--bad);
	}
	.preview,
	.empty {
		margin: 0.4rem 0 0;
		font-size: 0.85rem;
		color: var(--ink-soft);
	}
	.preview.warn {
		color: var(--bad);
	}
	.preview.good {
		color: var(--good);
	}
</style>
