<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import NavBar from '$lib/components/NavBar.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { page, navigating } from '$app/state';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { theme } from '$lib/state/theme.svelte';
	import { categoryOrder } from '$lib/state/categoryOrder.svelte';
	import { shoppingListOrder } from '$lib/state/shoppingListOrder.svelte';
	import { inventoryOrder } from '$lib/state/inventoryOrder.svelte';
	import { recipeOrder } from '$lib/state/recipeOrder.svelte';
	import { recipeViewMode } from '$lib/state/recipeViewMode.svelte';
	import { expirySettings } from '$lib/state/expirySettings.svelte';
	import { keyboardInset } from '$lib/state/keyboardInset.svelte';
	import { locale } from '$lib/i18n/index.svelte';
	import SkeletonList from '$lib/components/SkeletonList.svelte';

	let { children } = $props();

	onMount(() => {
		// The boot splash in app.html is static HTML shown while the root load() blocks on
		// session restore — remove it now that the app has actually mounted and rendered.
		document.getElementById('boot-splash')?.remove();

		theme.restore();
		categoryOrder.restore();
		shoppingListOrder.restore();
		inventoryOrder.restore();
		recipeOrder.restore();
		recipeViewMode.restore();
		expirySettings.restore();
		locale.restore();

		// The CSS-level html/body scroll-lock (app.css) stops the *page* from ever
		// scrolling, but iOS's automatic keyboard avoidance repositions the WKWebView's
		// native UIScrollView content offset directly at the OS layer — that bypasses CSS
		// entirely, which is why the nav bar could still drift after the keyboard dismissed.
		// Disabling the webview's own scroll natively closes that gap; keyboardInset.watch()
		// does that and tracks the live keyboard height so fixed/padded UI can stay clear of it.
		return keyboardInset.watch();
	});

	const noNavRoutes = ['/', '/welcome', '/verify-email', '/forgot-password'];
	let showNav = $derived(!noNavRoutes.includes(page.url.pathname));

	// STO-15's boot splash only covers first launch — this is the equivalent signal for
	// in-app navigation (e.g. into a recipe detail with a slow load). Debounced so a fast
	// navigation never flashes it.
	let showNavProgress = $state(false);
	$effect(() => {
		if (navigating.to) {
			const timer = setTimeout(() => (showNavProgress = true), 150);
			return () => {
				clearTimeout(timer);
				showNavProgress = false;
			};
		}
		showNavProgress = false;
	});

	// STO-60: the three collection screens have an obvious list shape, so a matching
	// skeleton reads better than the generic top progress bar alone while their data loads.
	const listSkeletonRoutes = new Set(['/recipes', '/inventory', '/shopping-lists']);
	let showListSkeleton = $derived(
		showNavProgress && listSkeletonRoutes.has(navigating.to?.route.id ?? '')
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if showNavProgress}
	<div class="nav-progress" aria-hidden="true"></div>
{/if}

<div class="app-shell">
	<main style:padding-bottom="{keyboardInset.current}px">
		{#if showListSkeleton}
			<div class="skeleton-overlay" in:fade={{ duration: 100 }}>
				<SkeletonList />
			</div>
		{/if}
		{#key page.url.pathname}
			<div class="page-transition" in:fade={{ duration: 130 }}>
				{@render children()}
			</div>
		{/key}
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
		position: relative;
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		transition: padding-bottom 0.25s ease;
	}
	.skeleton-overlay {
		position: absolute;
		inset: 0;
		z-index: 5;
		background: var(--paper);
	}
	.nav-progress {
		position: fixed;
		top: env(safe-area-inset-top);
		left: 0;
		right: 0;
		height: 3px;
		overflow: hidden;
		z-index: 200;
		background: transparent;
		pointer-events: none;
	}
	.nav-progress::after {
		content: '';
		position: absolute;
		top: 0;
		left: -30%;
		width: 30%;
		height: 100%;
		background: var(--accent);
		animation: nav-progress-slide 1s ease-in-out infinite;
	}
	@keyframes nav-progress-slide {
		0% {
			left: -30%;
		}
		100% {
			left: 100%;
		}
	}
</style>
