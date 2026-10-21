<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import {
		createHousehold,
		createInvite,
		deleteHousehold,
		joinHousehold,
		leaveHousehold,
		removeMember,
		renameHousehold,
		revokeInvite,
		type Household
	} from '$lib/api/households';
	import { Capacitor } from '@capacitor/core';
	import { Share } from '@capacitor/share';
	import { session } from '$lib/state/session.svelte';
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
	let expandedId = $state<string | null>(null);
	let joinCode = $state('');
	let leaving = $state<Household | null>(null);

	async function copyCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
			toast.push(t('households.codeCopied'), 'info');
		} catch {
			// clipboard blocked — code is on screen anyway
		}
	}

	async function shareCode(h: Household) {
		await Share.share({ text: t('households.inviteMessage', { name: h.name, code: h.inviteCode ?? '' }) }).catch(() => {});
	}

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
						<button type="button" class="info" onclick={() => (expandedId = expandedId === h._id ? null : h._id)}>
							<span class="name">{h.name}</span>
							<span class="hint">
								{t('households.members', { count: h.members.length })}{h.isOwner ? ` · ${t('households.owner')}` : ''}
							</span>
						</button>
						{#if !h.isOwner}
							<div class="row-actions">
								<button type="button" class="danger" onclick={() => (leaving = h)}>{t('households.leave')}</button>
							</div>
						{/if}
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
				{#if expandedId === h._id}
					<li class="detail">
						<ul class="members">
							{#each h.members as m (m._id)}
								<li>
									<span>
										{m.displayName ?? m.username}
										{#if m._id === h.ownerId}<span class="hint">· {t('households.owner')}</span>{/if}
										{#if m._id === session.user?._id}<span class="hint">· {t('households.you')}</span>{/if}
									</span>
									{#if h.isOwner && m._id !== h.ownerId}
										<button type="button" class="danger small" disabled={busy} onclick={() => run(() => removeMember(h._id, m._id))}>
											{t('households.removeMember')}
										</button>
									{/if}
								</li>
							{/each}
						</ul>
						{#if h.isOwner}
							{#if h.inviteCode}
								<p class="hint">{t('households.inviteHint')}</p>
								{#if h.inviteExpiresAt}
									<p class="hint">{t('households.inviteExpires', { date: new Date(h.inviteExpiresAt).toLocaleDateString() })}</p>
								{/if}
								<div class="code-row">
									<code>{h.inviteCode}</code>
									<button type="button" onclick={() => copyCode(h.inviteCode!)}>{t('households.copyCode')}</button>
									{#if Capacitor.isNativePlatform()}
										<button type="button" onclick={() => shareCode(h)}>{t('households.shareCode')}</button>
									{/if}
								</div>
								<button type="button" class="link danger" disabled={busy} onclick={() => run(() => revokeInvite(h._id))}>
									{t('households.revoke')}
								</button>
							{:else}
								<button type="button" class="invite" disabled={busy} onclick={() => run(() => createInvite(h._id))}>
									{t('households.invite')}
								</button>
							{/if}
						{/if}
					</li>
				{/if}
			{/each}
		</ul>
	{/if}

	<form
		class="inline"
		onsubmit={(e) => {
			e.preventDefault();
			const code = joinCode.trim();
			if (!code) return;
			run(async () => {
				const h = await joinHousehold(code);
				toast.push(t('households.joined', { name: h.name }), 'info');
			}).then(() => (joinCode = ''));
		}}
	>
		<input type="text" maxlength="12" autocapitalize="characters" placeholder={t('households.joinPlaceholder')} bind:value={joinCode} />
		<button type="submit" disabled={busy || !joinCode.trim()}>{t('households.join')}</button>
	</form>

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
	open={leaving !== null}
	title={t('households.leaveTitle', { name: leaving?.name ?? '' })}
	message={t('households.leaveMessage')}
	confirmLabel={t('households.leave')}
	confirmingLabel={t('households.leave')}
	cancelLabel={t('common.cancel')}
	confirming={busy}
	onConfirm={() => {
		const h = leaving!;
		run(async () => {
			await leaveHousehold(h._id);
			if (activePantry.current === h._id) await activePantry.set(null);
		}).then(() => (leaving = null));
	}}
	onCancel={() => (leaving = null)}
/>

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
		align-items: flex-start;
		min-width: 0;
		border: none;
		background: none;
		color: inherit;
		font: inherit;
		padding: 0;
		text-align: left;
		cursor: pointer;
	}
	li.detail {
		flex-direction: column;
		align-items: stretch;
		background: var(--paper);
	}
	.members {
		border: none;
	}
	.members li {
		background: transparent;
		padding: 0.3rem 0;
		font-size: var(--text-sm);
	}
	.code-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.code-row code {
		font-family: var(--mono);
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		padding: 0.25rem 0.5rem;
		border: 1px dashed var(--accent);
		border-radius: 6px;
		color: var(--accent);
	}
	.code-row button,
	.invite,
	.small {
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
		font-size: 0.8rem;
		padding: 0.3rem 0.55rem;
		cursor: pointer;
	}
	.invite {
		align-self: flex-start;
		border-color: var(--accent);
		color: var(--accent);
		font-weight: 600;
	}
	.small.danger {
		color: var(--bad);
	}
	.link {
		align-self: flex-start;
		border: none;
		background: none;
		font: inherit;
		font-size: var(--text-xs);
		text-decoration: underline;
		cursor: pointer;
		padding: 0;
	}
	.link.danger {
		color: var(--bad);
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
