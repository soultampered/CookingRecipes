<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="error-page">
	<h1>Something went wrong</h1>
	<p>{page.error?.message ?? 'That page could not be loaded.'}</p>
	<a href="/recipes">Back to Recipes</a>
</div>

<style>
	.error-page {
		max-width: 360px;
		margin: 3rem auto;
		padding: 0 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		text-align: center;
	}
	p {
		color: var(--ink-soft);
		font-size: 0.9rem;
	}
	a {
		color: var(--accent);
		font-weight: 600;
	}
</style>
