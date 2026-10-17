<script lang="ts">
	import { MEAL_SLOTS, type MealSlot } from '$lib/api/mealPlan';
	import { t } from '$lib/i18n/index.svelte';

	// STO-9: optional meal slot picker; null = any.
	let { value = $bindable(null) }: { value: MealSlot | null } = $props();
</script>

<div class="chips">
	<button type="button" class:active={value === null} onclick={() => (value = null)}>{t('mealPlan.anySlot')}</button>
	{#each MEAL_SLOTS as slot (slot)}
		<button type="button" class:active={value === slot} onclick={() => (value = slot)}>{t(`mealPlan.slot.${slot}`)}</button>
	{/each}
</div>

<style>
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	button {
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
		font-size: var(--text-xs);
		padding: 0.25rem 0.6rem;
		cursor: pointer;
	}
	button.active {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--paper-raised);
	}
</style>
