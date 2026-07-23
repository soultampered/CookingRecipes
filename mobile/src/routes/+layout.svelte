<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import NavBar from '$lib/components/NavBar.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { theme } from '$lib/state/theme.svelte';

	let { children } = $props();

	onMount(() => {
		theme.restore();

		// iOS/WKWebView sometimes leaves fixed-position elements (the nav bar) displaced
		// after the on-screen keyboard dismisses, since the visual viewport doesn't always
		// recompute until a scroll event fires. Forcing one on every blur is the standard
		// workaround for this.
		const resetScrollAfterKeyboard = () => {
			setTimeout(() => window.scrollTo(0, 0), 50);
		};
		document.addEventListener('focusout', resetScrollAfterKeyboard);
		return () => document.removeEventListener('focusout', resetScrollAfterKeyboard);
	});

	const noNavRoutes = ['/', '/welcome', '/verify-email', '/forgot-password'];
	let showNav = $derived(!noNavRoutes.includes(page.url.pathname));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main class:with-nav={showNav}>
	{@render children()}
</main>

{#if showNav}
	<NavBar />
{/if}

<Toast />

<style>
	main.with-nav {
		padding-bottom: 4.5rem;
	}
</style>
