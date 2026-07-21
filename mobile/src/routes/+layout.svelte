<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import NavBar from '$lib/components/NavBar.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { page } from '$app/state';

	let { children } = $props();

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
