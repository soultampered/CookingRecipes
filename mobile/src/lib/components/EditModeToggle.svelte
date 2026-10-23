<script lang="ts">
	import { t } from '$lib/i18n/index.svelte';

	// One toggle for all reorderable lists, so drag never fights tap/swipe.
	let { editing, onToggle }: { editing: boolean; onToggle: () => void } = $props();
</script>

<button
	type="button"
	class="edit-toggle"
	class:active={editing}
	aria-pressed={editing}
	onclick={onToggle}
>
	{editing ? t('common.done') : t('common.reorder')}
</button>

<style>
	.edit-toggle {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		font-family: inherit;
		color: var(--ink);
		background: var(--paper-raised);
		cursor: pointer;
		white-space: nowrap;
	}
	.edit-toggle.active {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
	}
</style>
