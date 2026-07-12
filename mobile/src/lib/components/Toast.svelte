<script lang="ts">
	import { toast } from '$lib/state/toast.svelte';
</script>

<div class="toasts">
	{#each toast.items as item (item.id)}
		<div class="toast toast-{item.type}">
			{item.message}
		</div>
	{/each}
</div>

<style>
	.toasts {
		position: fixed;
		bottom: 5.5rem;
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
		font-size: 0.85rem;
		box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.3);
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
