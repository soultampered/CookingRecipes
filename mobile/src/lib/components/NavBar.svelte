<script lang="ts">
	import { page } from '$app/state';
	import NavIcon from './NavIcon.svelte';
	import { t } from '$lib/i18n/index.svelte';

	const tabs = [
		{ href: '/dashboard', labelKey: 'nav.dashboard', icon: 'dashboard' },
		{ href: '/recipes', labelKey: 'nav.recipes', icon: 'recipes' },
		{ href: '/inventory', labelKey: 'nav.inventory', icon: 'inventory' },
		{ href: '/shopping-lists', labelKey: 'nav.shopping', icon: 'shopping' },
		{ href: '/account', labelKey: 'nav.account', icon: 'account' }
	] as const;
</script>

<nav>
	{#each tabs as tab}
		<a href={tab.href} class:active={page.url.pathname === tab.href}>
			<NavIcon name={tab.icon} />
			<span>{t(tab.labelKey)}</span>
		</a>
	{/each}
</nav>

<style>
	nav {
		flex: 0 0 auto;
		display: flex;
		justify-content: center;
		border-top: 1px solid var(--line);
		background: var(--paper-raised);
		padding: 0.4rem 0.1rem calc(0.6rem + env(safe-area-inset-bottom));
	}
	a {
		flex: 0 1 84px;
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
