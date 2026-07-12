<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import NavBar from '$lib/components/NavBar.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { page } from '$app/state';

	let { children } = $props();

	let showNav = $derived(page.url.pathname !== '/welcome' && page.url.pathname !== '/');
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
