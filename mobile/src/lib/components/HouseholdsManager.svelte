<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { createHousehold, deleteHousehold, renameHousehold, type Household } from '$lib/api/households';
	import { ApiError } from '$lib/api/client';
	import { activePantry } from '$lib/state/activePantry.svelte';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import ConfirmModal from './ConfirmModal.svelte';

	// Create/rename/delete pantries, plus members and invites.
	let newName = $state('');
	let busy = $state(false);
	let renamingId = $state<string | null>(null);
	let renameDraft = $state('');
	let deleting = $state<Household | null>(null);

	onMount(() => activePantry.refresh());

	async function run(fn: () => Promise<unknown>) {
		busy = true;
		try {
			await fn();
			await activePantry.refresh();
			await invalidate('app:pantry');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('households.error'));
		} finally {
			busy = false;
		}
	}
</script>

<div class="households" id="households">
	<span class="label">{t('households.title')}</span>
	<p class="hint">{t('households.hint')}</p>

	{#if activePantry.households.length}
		<ul>
			{#each activePantry.households as h (h._id)}
				<li>
					{#if renamingId === h._id}
						<form
							class="inline"
							onsubmit={(e) => {
								e.preventDefault();
								run(() => renameHousehold(h._id, renameDraft.trim())).then(() => (renamingId = null));
							}}
						>
							<input type="text" maxlength="60" bind:value={renameDraft} required />
							<button type="submit" disabled={busy}>✓</button>
						</form>
					{:else}
						<div class="info">
							<span class="name">{h.name}</span>
							<span class="hint">
								{t('households.members', { count: h.members.length })}{h.isOwner ? ` · ${t('households.owner')}` : ''}
							</span>
						</div>
						{#if h.isOwner}
							<div class="row-actions">
								<button
									type="button"
									onclick={() => {
										renamingId = h._id;
										renameDraft = h.name;
									}}>{t('households.rename')}</button
								>
								<button type="button" class="danger" onclick={() => (deleting = h)}>{t('households.delete')}</button>
							</div>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<form
		class="inline"
		onsubmit={(e) => {
			e.preventDefault();
			const name = newName.trim();
			if (name) run(() => createHousehold(name)).then(() => (newName = ''));
		}}
	>
		<input type="text" maxlength="60" placeholder={t('households.namePlaceholder')} bind:value={newName} />
		<button type="submit" disabled={busy || !newName.trim()}>{t('households.create')}</button>
	</form>
</div>

<ConfirmModal
	open={deleting !== null}
	title={t('households.deleteTitle', { name: deleting?.name ?? '' })}
	message={t('households.deleteMessage')}
	confirmLabel={t('households.delete')}
	confirmingLabel={t('common.deleting')}
	cancelLabel={t('common.cancel')}
	confirming={busy}
	onConfirm={() => {
		const h = deleting!;
		run(async () => {
			await deleteHousehold(h._id);
			if (activePantry.current === h._id) await activePantry.set(null);
		}).then(() => (deleting = null));
	}}
	onCancel={() => (deleting = null)}
/>

<style>
	.households {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
		scroll-margin-top: 1rem;
	}
	.label {
		font-size: 0.95rem;
		font-weight: 600;
	}
	.hint {
		margin: 0;
		font-size: 0.78rem;
		color: var(--ink-soft);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 8px;
	}
	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.55rem 0.7rem;
		border-bottom: 1px solid var(--line);
		background: var(--paper-raised);
	}
	li:last-child {
		border-bottom: none;
	}
	.info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.name {
		font-weight: 600;
		font-size: var(--text-sm);
	}
	.row-actions {
		display: flex;
		gap: 0.3rem;
	}
	.row-actions button,
	.inline button {
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
		font-size: 0.8rem;
		padding: 0.3rem 0.55rem;
		cursor: pointer;
	}
	.row-actions .danger {
		color: var(--bad);
	}
	.inline {
		display: flex;
		gap: 0.4rem;
		flex: 1;
	}
	.inline input {
		flex: 1;
		min-width: 0;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
	}
</style>
