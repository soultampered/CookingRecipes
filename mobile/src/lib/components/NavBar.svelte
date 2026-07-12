<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ href: '/recipes', label: 'Recipes' },
		{ href: '/inventory', label: 'Inventory' },
		{ href: '/recipes/suggestions', label: 'Suggestions' },
		{ href: '/account', label: 'Account' }
	];
</script>

<nav>
	{#each tabs as tab}
		<a href={tab.href} class:active={page.url.pathname === tab.href}>{tab.label}</a>
	{/each}
</nav>

<style>
	nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		border-top: 1px solid #ddd;
		background: white;
		padding: 0.5rem 0.25rem calc(0.75rem + env(safe-area-inset-bottom));
		z-index: 10;
	}
	a {
		flex: 1;
		text-align: center;
		font-size: 0.72rem;
		color: #666;
		text-decoration: none;
		padding: 0.3rem 0;
	}
	a.active {
		color: #6e3550;
		font-weight: 700;
	}
</style>
