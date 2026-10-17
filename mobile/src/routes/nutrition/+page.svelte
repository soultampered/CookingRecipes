<script lang="ts">
	import { t, locale } from '$lib/i18n/index.svelte';
	import PullToRefresh from '$lib/components/PullToRefresh.svelte';
	import type { PageProps } from './$types';

	// STO-22: 7-day rollup of prepared recipes.
	let { data }: PageProps = $props();

	let today = $derived(data.days[data.days.length - 1]);
	let maxCalories = $derived(Math.max(1, ...data.days.map((d) => d.calories)));
	let average = $derived(Math.round(data.days.reduce((sum, d) => sum + d.calories, 0) / data.days.length));

	function dayLabel(date: string) {
		return new Date(`${date}T12:00:00`).toLocaleDateString(locale.current, { weekday: 'short', day: 'numeric' });
	}
	function r(n: number) {
		return Math.round(n);
	}
</script>

<PullToRefresh dependency="app:nutrition">
	<div class="page">
		<a class="back" href="/dashboard">‹ {t('dashboard.title')}</a>
		<h1>{t('nutrition.title')}</h1>
		<p class="hint">{t('nutrition.hint')}</p>

		<section class="today">
			<span class="label">{t('nutrition.today')}</span>
			<span class="big">{t('nutrition.kcal', { count: r(today.calories) })}</span>
			<span class="macros">{t('nutrition.macros', { protein: r(today.protein), carbs: r(today.carbs), fat: r(today.fat) })}</span>
			{#if today.preparations.length === 0}
				<span class="muted">{t('nutrition.nothing')}</span>
			{/if}
		</section>

		<div class="section-head">
			<span class="label">{t('nutrition.last7')}</span>
			<span class="muted">{t('nutrition.dailyAverage')}: {t('nutrition.kcal', { count: average })}</span>
		</div>
		<ul class="days">
			{#each [...data.days].reverse() as day (day.date)}
				<li>
					<div class="day-head">
						<span class="day-name">{dayLabel(day.date)}</span>
						<span class="day-kcal">{t('nutrition.kcal', { count: r(day.calories) })}</span>
					</div>
					<div class="bar"><span style:width={`${(day.calories / maxCalories) * 100}%`}></span></div>
					{#if day.preparations.length}
						<span class="muted">
							{day.preparations
								.map((p) => t('nutrition.servingsOf', { servings: p.servings, title: p.recipeTitle }))
								.join(' · ')}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</PullToRefresh>

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.back {
		color: var(--accent);
		text-decoration: none;
		font-size: var(--text-sm);
	}
	h1 {
		margin: 0;
	}
	.hint,
	.muted {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--ink-soft);
	}
	.today {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.9rem;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--paper-raised);
	}
	.label {
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.big {
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.macros {
		font-size: var(--text-sm);
	}
	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.days {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.day-head {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-sm);
	}
	.day-kcal {
		font-variant-numeric: tabular-nums;
	}
	.bar {
		height: 8px;
		border-radius: 999px;
		background: var(--accent-soft);
		overflow: hidden;
		margin: 0.2rem 0;
	}
	.bar span {
		display: block;
		height: 100%;
		background: var(--accent);
		border-radius: 999px;
	}
</style>
