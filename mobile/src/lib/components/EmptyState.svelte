<script lang="ts">
	let {
		message,
		ctaLabel,
		ctaHref,
		onCta
	}: {
		message: string;
		ctaLabel?: string;
		ctaHref?: string;
		onCta?: () => void;
	} = $props();
</script>

<div class="empty-state">
	<p class="empty-message">{message}</p>
	{#if ctaLabel && ctaHref}
		<a class="empty-cta" href={ctaHref}>{ctaLabel}</a>
	{:else if ctaLabel && onCta}
		<button type="button" class="empty-cta" onclick={onCta}>{ctaLabel}</button>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.9rem;
		padding: 2rem 1rem;
		text-align: center;
	}
	.empty-message {
		color: var(--ink-soft);
		font-size: 0.9rem;
		margin: 0;
	}
	.empty-cta {
		border: none;
		border-radius: 8px;
		padding: 0.65rem 1.1rem;
		background: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
		font-size: 0.9rem;
		text-decoration: none;
		cursor: pointer;
	}
</style>
