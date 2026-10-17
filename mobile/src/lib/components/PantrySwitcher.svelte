<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { activePantry } from '$lib/state/activePantry.svelte';
	import { t } from '$lib/i18n/index.svelte';

	// STO-88: hidden until the user has a second pantry, so single-kitchen users see nothing new.
	onMount(() => {
		activePantry.refresh();
	});

	async function onChange(e: Event) {
		const value = (e.target as HTMLSelectElement).value;
		if (value === '__manage') {
			(e.target as HTMLSelectElement).value = activePantry.current ?? '';
			await goto('/account#households');
			return;
		}
		await activePantry.set(value || null);
		await invalidate('app:pantry');
	}
</script>

{#if activePantry.households.length > 0}
	<select class="pantry" aria-label={t('pantry.label')} value={activePantry.current ?? ''} onchange={onChange}>
		<option value="">📍 {t('pantry.mine')}</option>
		{#each activePantry.households as h (h._id)}
			<option value={h._id}>📍 {h.name}</option>
		{/each}
		<option value="__manage">{t('pantry.manage')}</option>
	</select>
{/if}

<style>
	.pantry {
		align-self: flex-start;
		max-width: 14rem;
		border: none;
		background: transparent;
		color: var(--accent);
		font: inherit;
		font-size: var(--text-xs);
		font-weight: 600;
		padding: 0;
		cursor: pointer;
	}
</style>
