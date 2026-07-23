<script lang="ts">
	import { page } from '$app/state';
	import NavIcon from './NavIcon.svelte';

	const tabs = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
		{ href: '/recipes', label: 'Recipes', icon: 'recipes' },
		{ href: '/inventory', label: 'Inventory', icon: 'inventory' },
		{ href: '/shopping-lists', label: 'Shopping', icon: 'shopping' },
		{ href: '/account', label: 'Account', icon: 'account' }
	];
</script>

<nav>
	{#each tabs as tab}
		<a href={tab.href} class:active={page.url.pathname === tab.href}>
			<NavIcon name={tab.icon} />
			<span>{tab.label}</span>
		</a>
	{/each}
</nav>

<style>
	nav {
		flex: 0 0 auto;
		display: flex;
		border-top: 1px solid var(--line);
		background: var(--paper-raised);
		padding: 0.4rem 0.1rem calc(0.6rem + env(safe-area-inset-bottom));
	}
	a {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		text-align: center;
		font-size: 0.62rem;
		color: var(--ink-soft);
		text-decoration: none;
		padding: 0.2rem 0;
	}
	a.active {
		color: var(--accent);
		font-weight: 700;
	}
</style>
