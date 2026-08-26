<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { t } from '$lib/i18n/index.svelte';
	import type { Snippet } from 'svelte';

	let { dependency, children }: { dependency: string; children: Snippet } = $props();

	const THRESHOLD = 64;

	let pulling = $state(false);
	let refreshing = $state(false);
	let pullDistance = $state(0);
	let startY = 0;
	let scrollEl: HTMLElement | null = null;

	// Scrolling itself happens on the single shared `<main>` in +layout.svelte, not on
	// anything this component owns — a pull is only ever a candidate gesture when that
	// ancestor is already scrolled to the very top.
	function onPointerDown(e: PointerEvent) {
		if (refreshing) return;
		scrollEl = (e.currentTarget as HTMLElement).closest('main');
		if (!scrollEl || scrollEl.scrollTop > 0) {
			scrollEl = null;
			return;
		}
		startY = e.clientY;
		pulling = true;
	}

	function onPointerMove(e: PointerEvent) {
		if (!pulling || refreshing) return;
		if (scrollEl && scrollEl.scrollTop > 0) {
			pulling = false;
			pullDistance = 0;
			return;
		}
		const delta = e.clientY - startY;
		pullDistance = delta > 0 ? Math.min(delta * 0.5, 100) : 0;
	}

	async function onPointerUp() {
		if (!pulling) return;
		pulling = false;
		if (pullDistance >= THRESHOLD) {
			refreshing = true;
			pullDistance = THRESHOLD;
			await invalidate(dependency);
			refreshing = false;
		}
		pullDistance = 0;
	}
</script>

<div
	class="pull-wrapper"
	role="presentation"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
>
	<div
		class="pull-indicator"
		class:visible={pullDistance > 0 || refreshing}
		style:height="{refreshing ? THRESHOLD : pullDistance}px"
	>
		<span class="spinner" class:spinning={refreshing} aria-hidden="true"></span>
		<span class="sr-only">{refreshing ? t('common.refreshing') : ''}</span>
	</div>
	{@render children()}
</div>

<style>
	.pull-wrapper {
		touch-action: pan-y;
	}
	.pull-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 0;
		overflow: hidden;
		transition: height 0.15s ease;
	}
	.pull-indicator.visible {
		transition: none;
	}
	.spinner {
		width: 1.2rem;
		height: 1.2rem;
		border: 2px solid var(--line);
		border-top-color: var(--accent);
		border-radius: 50%;
	}
	.spinner.spinning {
		animation: spin 0.7s linear infinite;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
