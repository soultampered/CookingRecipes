<script lang="ts">
	import { onMount } from 'svelte';
	import { Capacitor } from '@capacitor/core';
	import { Share } from '@capacitor/share';
	import { enableShare, disableShare } from '$lib/api/recipes';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';

	// Shows an existing link; nothing is public until Create link. Stop sharing revokes.
	let {
		recipeId,
		title,
		shared,
		onClose
	}: { recipeId: string; title: string; shared: boolean; onClose: () => void } = $props();

	let url = $state<string | null>(null);
	let busy = $state(false);

	async function createLink(closeOnError: boolean) {
		busy = true;
		try {
			url = (await enableShare(recipeId)).url;
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('share.error'));
			if (closeOnError) onClose();
		} finally {
			busy = false;
		}
	}

	// Re-reads the existing link; creates nothing.
	onMount(() => {
		if (shared) createLink(true);
	});

	async function copy() {
		if (!url) return;
		try {
			await navigator.clipboard.writeText(url);
			toast.push(t('share.copied'), 'info');
		} catch {
			toast.push(t('share.error'));
		}
	}

	async function send() {
		if (!url) return;
		try {
			await Share.share({ title, url });
		} catch {
			// dismissed
		}
	}

	async function stop() {
		busy = true;
		try {
			await disableShare(recipeId);
			toast.push(t('share.stopped'), 'info');
			onClose();
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('share.error'));
		} finally {
			busy = false;
		}
	}
</script>

<div class="backdrop" role="presentation" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}>
	<div class="sheet" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
		<h2>{t('share.title')}</h2>
		<p class="hint">{t('share.hint')}</p>
		{#if !shared && !url}
			<div class="actions">
				<button type="button" class="primary" disabled={busy} onclick={() => createLink(false)}>{t('share.create')}</button>
			</div>
		{:else}
			<input class="link" type="text" readonly value={url ?? '…'} onfocus={(e) => (e.target as HTMLInputElement).select()} />
			<div class="actions">
				<button type="button" class="primary" disabled={!url} onclick={copy}>{t('share.copy')}</button>
				{#if Capacitor.isNativePlatform()}
					<button type="button" class="primary" disabled={!url} onclick={send}>{t('share.send')}</button>
				{/if}
			</div>
			<button type="button" class="stop" disabled={!url || busy} onclick={stop}>{t('share.stop')}</button>
		{/if}
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.25rem;
		z-index: 100;
	}
	.sheet {
		width: 100%;
		max-width: 360px;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	h2 {
		margin: 0;
		font-size: 1rem;
	}
	.hint {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--ink-soft);
	}
	.link {
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper);
		color: var(--ink);
		font-family: var(--mono);
		font-size: var(--text-xs);
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	.primary {
		flex: 1;
		border: none;
		border-radius: 8px;
		padding: 0.55rem;
		background: var(--accent);
		color: var(--paper-raised);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.stop {
		border: none;
		background: none;
		color: var(--bad);
		font: inherit;
		font-size: var(--text-sm);
		text-decoration: underline;
		cursor: pointer;
	}
</style>
