<script lang="ts">
	let {
		open,
		title,
		message,
		confirmLabel = 'Delete',
		confirmingLabel = 'Deleting…',
		cancelLabel = 'Cancel',
		confirming = false,
		onConfirm,
		onCancel
	}: {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		confirmingLabel?: string;
		cancelLabel?: string;
		confirming?: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	// This can open with a form input still focused (e.g. STO-95's discard-changes prompt on
	// hardware back). On iOS the keyboard doesn't auto-dismiss with the input still mounted,
	// and — because the WKWebView's own scroll is disabled to keep the keyboard from
	// desyncing the layout (see +layout.svelte) — it overlays without resizing the viewport,
	// which can leave this modal's buttons rendered underneath it. Blurring on open sidesteps
	// that entirely instead of trying to reposition around the keyboard.
	$effect(() => {
		if (open) (document.activeElement as HTMLElement | null)?.blur?.();
	});
</script>

{#if open}
	<div
		class="backdrop"
		role="presentation"
		onclick={onCancel}
		onkeydown={(e) => e.key === 'Escape' && onCancel()}
	>
		<div
			class="modal"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="confirm-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 id="confirm-title">{title}</h2>
			<p>{message}</p>
			<div class="actions">
				<button type="button" class="outline" onclick={onCancel} disabled={confirming}>
					{cancelLabel}
				</button>
				<button type="button" class="danger" onclick={onConfirm} disabled={confirming}>
					{confirming ? confirmingLabel : confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}

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
	.modal {
		width: 100%;
		max-width: 340px;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.modal h2 {
		margin: 0;
		font-size: 1.05rem;
	}
	.modal p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--ink-soft);
		line-height: 1.5;
	}
	.actions {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.4rem;
	}
	.outline,
	.danger {
		flex: 1;
		padding: 0.7rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
	}
	.outline {
		border: 1px solid var(--line);
		background: var(--paper-raised);
		color: var(--ink);
	}
	.danger {
		border: 1px solid var(--bad);
		background: var(--paper-raised);
		color: var(--bad);
	}
</style>
