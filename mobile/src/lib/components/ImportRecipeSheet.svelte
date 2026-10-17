<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { importRecipe } from '$lib/api/recipes';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';

	// Paste a link → import → review in the editor.
	let { onClose }: { onClose: () => void } = $props();
	let url = $state('');
	let busy = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			const result = await importRecipe(url.trim());
			await invalidate('app:recipes');
			toast.push(
				result.createdInventoryNames.length
					? `${t('import.done')} · ${t('import.createdItems', { count: result.createdInventoryNames.length })}`
					: t('import.done'),
				'info'
			);
			onClose();
			await goto(`/recipes/${result.recipe._id}/edit`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('import.error'));
		} finally {
			busy = false;
		}
	}

	async function pasteFromClipboard() {
		try {
			const text = await navigator.clipboard.readText();
			if (/^https?:\/\//i.test(text.trim())) url = text.trim();
		} catch {
			// clipboard permission denied — user can paste manually
		}
	}
</script>

<div class="backdrop" role="presentation" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}>
	<div class="sheet" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
		<h2>{t('import.title')}</h2>
		<p class="hint">{t('import.hint')}</p>
		<form onsubmit={submit}>
			<input type="url" inputmode="url" required placeholder={t('import.placeholder')} bind:value={url} onfocus={pasteFromClipboard} />
			<div class="actions">
				<button type="button" class="outline" onclick={onClose}>{t('common.cancel')}</button>
				<button type="submit" class="primary" disabled={busy || !url.trim()}>{busy ? t('import.importing') : t('import.button')}</button>
			</div>
		</form>
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
		max-width: 380px;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
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
	form {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	input {
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	.actions button {
		flex: 1;
		padding: 0.6rem;
		border-radius: 8px;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.outline {
		border: 1px solid var(--line);
		background: var(--paper-raised);
		color: var(--ink);
	}
	.primary {
		border: none;
		background: var(--accent);
		color: var(--paper-raised);
	}
	.primary:disabled {
		opacity: 0.5;
	}
</style>
