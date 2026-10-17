<script lang="ts">
	import { toast } from '$lib/state/toast.svelte';
	import { keyboardInset } from '$lib/state/keyboardInset.svelte';
</script>

<div
	class="toasts"
	role="status"
	aria-live="polite"
	style:bottom="calc(5.5rem + {keyboardInset.current}px)"
>
	{#each toast.items as item (item.id)}
		<div class="toast toast-{item.type}">
			<span>{item.message}</span>
			{#if item.action}
				<button
					type="button"
					class="toast-action"
					onclick={async () => {
						toast.dismiss(item.id);
						await item.action!.run();
					}}
				>
					{item.action.label}
				</button>
			{/if}
		</div>
	{/each}
</div>

<style>
	.toasts {
		position: fixed;
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		z-index: 100;
		pointer-events: none;
	}
	.toast {
		max-width: 320px;
		padding: 0.6rem 0.9rem;
		border-radius: 8px;
		font-size: var(--text-sm);
		box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.toast-action {
		pointer-events: auto;
		border: 1px solid currentColor;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		font: inherit;
		font-weight: 700;
		padding: 0.2rem 0.55rem;
		cursor: pointer;
	}
	.toast-error {
		background: var(--bad);
		color: var(--paper-raised);
	}
	.toast-info {
		background: var(--good);
		color: var(--paper-raised);
	}
</style>
