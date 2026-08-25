<script lang="ts">
	import { page } from '$app/state';
	import { t } from '$lib/i18n/index.svelte';
</script>

<div class="error-page">
	<h1>{t('error.title')}</h1>
	<p>{page.error?.message ?? t('error.fallback')}</p>
	<a href="/recipes">{t('error.backToRecipes')}</a>
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
