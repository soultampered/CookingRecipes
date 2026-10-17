<script lang="ts">
	import { addToMealPlan, type MealSlot } from '$lib/api/mealPlan';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t, locale } from '$lib/i18n/index.svelte';
	import { addDays, toLocalISODate } from '$lib/utils/dates';
	import SlotChips from './SlotChips.svelte';

	// STO-9: plan this recipe on one of the next 14 days.
	let { recipeId, title, onClose }: { recipeId: string; title: string; onClose: () => void } = $props();

	const today = new Date();
	const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
	let date = $state(toLocalISODate(today));
	let slot = $state<MealSlot | null>('dinner');
	let busy = $state(false);

	function label(d: Date, i: number) {
		if (i === 0) return t('mealPlan.today');
		return d.toLocaleDateString(locale.current, { weekday: 'short', day: 'numeric' });
	}

	async function save() {
		busy = true;
		try {
			await addToMealPlan({ date, recipeId, slot: slot ?? undefined });
			toast.push(t('mealPlan.planned'), 'info');
			onClose();
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('mealPlan.error'));
		} finally {
			busy = false;
		}
	}
</script>

<div class="backdrop" role="presentation" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}>
	<div class="sheet" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
		<h2>{t('mealPlan.planTitle', { title })}</h2>
		<div class="days">
			{#each days as d, i (i)}
				{@const iso = toLocalISODate(d)}
				<button type="button" class:active={date === iso} onclick={() => (date = iso)}>{label(d, i)}</button>
			{/each}
		</div>
		<SlotChips bind:value={slot} />
		<div class="actions">
			<button type="button" class="outline" onclick={onClose}>{t('common.cancel')}</button>
			<button type="button" class="primary" disabled={busy} onclick={save}>{t('mealPlan.plan')}</button>
		</div>
	</div>
</div>

<style>
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
	.sheet {
		width: 100%;
		max-width: 380px;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	h2 {
		margin: 0;
		font-size: 1rem;
	}
	.days {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.3rem;
	}
	.days button {
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		font-size: var(--text-xs);
		padding: 0.4rem 0.2rem;
		cursor: pointer;
	}
	.days button.active {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	.actions button {
		flex: 1;
		padding: 0.6rem;
		border-radius: 8px;
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
</style>
