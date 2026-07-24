<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import NavBar from '$lib/components/NavBar.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { theme } from '$lib/state/theme.svelte';
	import { Capacitor } from '@capacitor/core';
	import { Keyboard } from '@capacitor/keyboard';

	let { children } = $props();

	// With Keyboard.resize: 'none', iOS never shrinks the webview for the keyboard, so it
	// just overlays the bottom of the screen. On a short page `main` has no scroll headroom
	// to begin with, so there's nothing to swipe to bring covered content (e.g. a submit
	// button) up above it. Tracking the live keyboard height and padding `main` by that
	// amount manufactures exactly enough scroll room while the keyboard is up.
	let keyboardInset = $state(0);

	onMount(() => {
		theme.restore();

		if (Capacitor.getPlatform() !== 'ios') return;

		// The CSS-level html/body scroll-lock (app.css) stops the *page* from ever
		// scrolling, but iOS's automatic keyboard avoidance repositions the WKWebView's
		// native UIScrollView content offset directly at the OS layer — that bypasses CSS
		// entirely, which is why the nav bar could still drift after the keyboard dismissed.
		// Disabling the webview's own scroll natively closes that gap.
		Keyboard.setScroll({ isDisabled: true });

		const showHandle = Keyboard.addListener('keyboardWillShow', (info) => {
			keyboardInset = info.keyboardHeight;
		});
		const hideHandle = Keyboard.addListener('keyboardWillHide', () => {
			keyboardInset = 0;
		});

		return () => {
			showHandle.then((h) => h.remove());
			hideHandle.then((h) => h.remove());
		};
	});

	const noNavRoutes = ['/', '/welcome', '/verify-email', '/forgot-password'];
	let showNav = $derived(!noNavRoutes.includes(page.url.pathname));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<main style:padding-bottom="{keyboardInset}px">
		{@render children()}
	</main>

	{#if showNav}
		<NavBar />
	{/if}
</div>

<Toast />

<style>
	.app-shell {
		/* The nav bar used to be `position: fixed`, which iOS/WKWebView can leave visually
		   displaced after the on-screen keyboard dismisses (a well-documented WebKit quirk —
		   the visual viewport and the layout viewport fixed-position is computed against can
		   desync, and it doesn't reliably reset). Structuring the nav as a normal flex-column
		   sibling of the scrollable content area — instead of floating it relative to the
		   viewport — sidesteps the whole bug category: it's never "fixed" to anything that can
		   desync in the first place. */
		height: 100vh;
		height: 100dvh;
		display: flex;
		flex-direction: column;
		/* Keeps content clear of the notch/Dynamic Island/status bar on every screen — the
		   WKWebView draws edge-to-edge, so without this, headers render straight under it. */
		padding-top: env(safe-area-inset-top);
	}
	main {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		transition: padding-bottom 0.25s ease;
	}
</style>
