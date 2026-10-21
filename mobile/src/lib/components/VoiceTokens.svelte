<script lang="ts">
	import { onMount } from 'svelte';
	import { createToken, listTokens, revokeToken, voiceAddUrl, type ApiTokenSummary } from '$lib/api/integrations';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t, locale } from '$lib/i18n/index.svelte';

	// Tokens for Shortcuts / IFTTT; plaintext shown once.
	let tokens = $state<ApiTokenSummary[]>([]);
	let name = $state('');
	let fresh = $state<string | null>(null);
	let busy = $state(false);
	let showSetup = $state(false);

	async function load() {
		try {
			tokens = await listTokens();
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('voice.error'));
		}
	}
	onMount(load);

	async function create(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			fresh = (await createToken(name.trim())).token;
			name = '';
			await load();
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('voice.error'));
		} finally {
			busy = false;
		}
	}

	async function revoke(id: string) {
		busy = true;
		try {
			await revokeToken(id);
			await load();
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('voice.error'));
		} finally {
			busy = false;
		}
	}

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.push(t('voice.copied'), 'info');
		} catch {
			// visible on screen anyway
		}
	}

	function when(iso?: string) {
		return iso ? t('voice.lastUsed', { date: new Date(iso).toLocaleDateString(locale.current) }) : t('voice.neverUsed');
	}
</script>

<div class="voice">
	<span class="label">{t('voice.title')}</span>
	<p class="hint">{t('voice.hint')}</p>
	<p class="hint">{t('voice.limits')}</p>

	{#if fresh}
		<div class="fresh">
			<p class="hint">{t('voice.copyOnce')}</p>
			<div class="row">
				<code>{fresh}</code>
				<button type="button" onclick={() => copy(fresh!)}>{t('voice.copy')}</button>
			</div>
		</div>
	{/if}

	{#if tokens.length}
		<ul>
			{#each tokens as tok (tok._id)}
				<li>
					<div class="info">
						<span class="name">{tok.name}</span>
						<span class="hint">
							{tok.prefix}… · {when(tok.lastUsedAt)}{#if tok.expired} · <strong class="expired">{t('voice.expired')}</strong>{/if}
						</span>
					</div>
					<button type="button" class="danger" disabled={busy} onclick={() => revoke(tok._id)}>{t('voice.revoke')}</button>
				</li>
			{/each}
		</ul>
	{/if}

	<form onsubmit={create}>
		<input type="text" maxlength="60" placeholder={t('voice.namePlaceholder')} bind:value={name} />
		<button type="submit" disabled={busy || !name.trim()}>{t('voice.create')}</button>
	</form>

	<button type="button" class="link" onclick={() => (showSetup = !showSetup)}>{t('voice.setup')}</button>
	{#if showSetup}
		<div class="setup">
			<p><strong>{t('voice.endpoint')}:</strong></p>
			<div class="row">
				<code>POST {voiceAddUrl()}</code>
				<button type="button" onclick={() => copy(voiceAddUrl())}>{t('voice.copy')}</button>
			</div>
			<p>{t('voice.setupSiri')}</p>
			<p>{t('voice.setupIfttt')}</p>
		</div>
	{/if}
</div>

<style>
	.expired {
		color: var(--bad);
		font-weight: 600;
	}
	.voice {
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
	.fresh {
		padding: 0.6rem;
		border: 1px dashed var(--accent);
		border-radius: 8px;
		background: var(--accent-soft);
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
	}
	code {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
		font-family: var(--mono);
		font-size: var(--text-xs);
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
		padding: 0.5rem 0.7rem;
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
	form {
		display: flex;
		gap: 0.4rem;
	}
	input {
		flex: 1;
		min-width: 0;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
	}
	button {
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
		font-size: 0.8rem;
		padding: 0.35rem 0.6rem;
		cursor: pointer;
		white-space: nowrap;
	}
	.danger {
		color: var(--bad);
	}
	.link {
		align-self: flex-start;
		border: none;
		background: none;
		padding: 0;
		color: var(--accent);
		text-decoration: underline;
	}
	.setup {
		font-size: var(--text-xs);
		color: var(--ink-soft);
	}
	.setup p {
		margin: 0.3rem 0;
	}
</style>
