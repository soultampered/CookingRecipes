<script lang="ts">
	let { rows = 6 }: { rows?: number } = $props();
</script>

<div class="page skeleton-list" aria-hidden="true">
	<div class="skeleton-block title"></div>
	{#each Array(rows) as _, i (i)}
		<div class="skeleton-row">
			<div class="skeleton-block avatar"></div>
			<div class="skeleton-lines">
				<div class="skeleton-block line-wide"></div>
				<div class="skeleton-block line-narrow"></div>
			</div>
		</div>
	{/each}
</div>

<style>
	.skeleton-list {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.skeleton-row {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}
	.skeleton-lines {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.skeleton-block {
		border-radius: 8px;
		background: linear-gradient(
			90deg,
			var(--line) 25%,
			var(--paper-raised) 37%,
			var(--line) 63%
		);
		background-size: 400% 100%;
		animation: shimmer 1.4s ease infinite;
	}
	.title {
		width: 40%;
		height: 1.4rem;
		margin-bottom: 0.4rem;
	}
	.avatar {
		flex: 0 0 auto;
		width: 40px;
		height: 40px;
		border-radius: 8px;
	}
	.line-wide {
		height: 0.9rem;
		width: 70%;
	}
	.line-narrow {
		height: 0.75rem;
		width: 40%;
	}
	@keyframes shimmer {
		0% {
			background-position: 100% 50%;
		}
		100% {
			background-position: 0% 50%;
		}
	}
</style>
