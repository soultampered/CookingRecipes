<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { listSessions, revokeOtherSessions, revokeSession, type SessionSummary } from '$lib/api/auth';
	import { ApiError } from '$lib/api/client';
	import { session } from '$lib/state/session.svelte';
	import { toast } from '$lib/state/toast.svelte';
	import { t, locale } from '$lib/i18n/index.svelte';

	// List and revoke signed-in devices.
	let sessions = $state<SessionSummary[] | null>(null);
	let busyId = $state<string | null>(null);

	async function load() {
		try {
			sessions = await listSessions(session.refreshToken);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('sessions.error'));
		}
	}

	onMount(load);

	function deviceLabel(ua?: string): string {
		if (!ua) return t('sessions.unknownDevice');
		const os = /iPhone/.test(ua)
			? 'iPhone'
			: /iPad/.test(ua)
				? 'iPad'
				: /Android/.test(ua)
					? 'Android'
					: /Mac OS X|Macintosh/.test(ua)
						? 'Mac'
						: /Windows/.test(ua)
							? 'Windows'
							: /Linux/.test(ua)
								? 'Linux'
								: null;
		return os ?? ua.split(/[\s/]/)[0];
	}

	function formatDate(iso?: string): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString(locale.current, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	async function signOut(s: SessionSummary) {
		busyId = s.id;
		try {
			await revokeSession(s.id);
			if (s.current) {
				await session.signOut();
				await goto('/welcome');
				return;
			}
			toast.push(t('sessions.signedOut'), 'info');
			await load();
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('sessions.error'));
		} finally {
			busyId = null;
		}
	}

	async function signOutOthers() {
		if (!session.refreshToken) return;
		busyId = '__others';
		try {
			await revokeOtherSessions(session.refreshToken);
			toast.push(t('sessions.othersSignedOut'), 'info');
			await load();
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('sessions.error'));
		} finally {
			busyId = null;
		}
	}
</script>

<div class="sessions">
	<span class="label">{t('sessions.title')}</span>
	<p class="hint">{t('sessions.hint')}</p>
	{#if sessions === null}
		<p class="hint">{t('sessions.loading')}</p>
	{:else}
		<ul>
			{#each sessions as s (s.id)}
				<li>
					<div class="info">
						<span class="device">
							{deviceLabel(s.userAgent)}
							{#if s.current}<span class="badge">{t('sessions.thisDevice')}</span>{/if}
						</span>
						<span class="dates">
							{t('sessions.lastActive', { date: formatDate(s.lastUsedAt) })} · {t('sessions.started', {
								date: formatDate(s.createdAt)
							})}
						</span>
					</div>
					<button type="button" class="revoke" disabled={busyId !== null} onclick={() => signOut(s)}>
						{t('sessions.signOut')}
					</button>
				</li>
			{/each}
		</ul>
		{#if sessions.length > 1 && session.refreshToken}
			<button type="button" class="others" disabled={busyId !== null} onclick={signOutOthers}>
				{t('sessions.signOutOthers')}
			</button>
		{/if}
	{/if}
</div>

<style>
	.sessions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
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
	li:first-child {
		border-radius: 8px 8px 0 0;
	}
	li:last-child {
		border-bottom: none;
		border-radius: 0 0 8px 8px;
	}
	.info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.device {
		font-size: var(--text-sm);
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.badge {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.05rem 0.4rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
	}
	.dates {
		font-size: var(--text-xs);
		color: var(--ink-soft);
	}
	.revoke,
	.others {
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--bad);
		font: inherit;
		font-size: 0.8rem;
		padding: 0.35rem 0.6rem;
		cursor: pointer;
		white-space: nowrap;
	}
	.others {
		align-self: flex-start;
	}
</style>
