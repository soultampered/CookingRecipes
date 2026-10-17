<script lang="ts">
	import { lookupBarcode, type BarcodeProduct } from '$lib/api/barcode';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { decodeBarcode } from '$lib/utils/barcode';

	// STO-23: photo → decode → Open Food Facts lookup → onFound(product). Typed-code fallback.
	let { onFound, compact = false }: { onFound: (p: BarcodeProduct) => void; compact?: boolean } = $props();

	let open = $state(false);
	let busy = $state(false);
	let typed = $state('');
	let input: HTMLInputElement | undefined = $state();

	async function lookup(code: string) {
		try {
			const product = await lookupBarcode(code);
			toast.push(t('barcode.found', { name: product.name }), 'info');
			onFound(product);
			open = false;
			typed = '';
		} catch (err) {
			toast.push(
				err instanceof ApiError && err.status === 404
					? t('barcode.notFound', { code })
					: err instanceof ApiError
						? err.message
						: t('barcode.notRead')
			);
		}
	}

	async function onPhoto(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		(e.target as HTMLInputElement).value = '';
		if (!file) return;
		busy = true;
		try {
			const code = await decodeBarcode(file);
			if (!code) toast.push(t('barcode.notRead'));
			else await lookup(code);
		} finally {
			busy = false;
		}
	}

	async function onTyped(e: SubmitEvent) {
		e.preventDefault();
		const code = typed.replace(/\D/g, '');
		if (!code) return;
		busy = true;
		await lookup(code);
		busy = false;
	}
</script>

<div class="scan">
	<button
		type="button"
		class="trigger"
		class:compact
		aria-label={t('barcode.scanAria')}
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		{compact ? '▥' : `▥ ${t('barcode.scan')}`}
	</button>
	{#if open}
		<div class="pop">
			<button type="button" class="take" disabled={busy} onclick={() => input?.click()}>
				{busy ? t('barcode.reading') : t('barcode.scan')}
			</button>
			<form onsubmit={onTyped}>
				<input type="text" inputmode="numeric" placeholder={t('barcode.typeIt')} bind:value={typed} maxlength="14" />
				<button type="submit" disabled={busy || !typed.trim()}>{t('barcode.lookup')}</button>
			</form>
		</div>
	{/if}
	<input bind:this={input} type="file" accept="image/*" capture="environment" hidden onchange={onPhoto} />
</div>

<style>
	.scan {
		position: relative;
	}
	.trigger {
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
		font-size: var(--text-sm);
		padding: 0.4rem 0.6rem;
		cursor: pointer;
		white-space: nowrap;
	}
	.trigger.compact {
		padding: 0.4rem 0.55rem;
		font-size: 1rem;
	}
	.pop {
		position: absolute;
		z-index: 60;
		bottom: calc(100% + 6px);
		right: 0;
		width: 240px;
		padding: 0.6rem;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 10px;
		box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}
	.take {
		border: none;
		border-radius: 8px;
		background: var(--accent);
		color: var(--paper-raised);
		font: inherit;
		font-weight: 600;
		padding: 0.5rem;
		cursor: pointer;
	}
	form {
		display: flex;
		gap: 0.3rem;
	}
	form input {
		flex: 1;
		min-width: 0;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		font-size: var(--text-sm);
	}
	form button {
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		font-size: var(--text-xs);
		cursor: pointer;
	}
</style>
