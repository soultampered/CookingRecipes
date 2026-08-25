<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { requestPasswordReset, resetPassword } from '$lib/api/auth';
	import { toast } from '$lib/state/toast.svelte';
	import { ApiError } from '$lib/api/client';
	import { t } from '$lib/i18n/index.svelte';

	let required = $derived(page.url.searchParams.get('required') === '1');

	let stage = $state<'request' | 'reset'>('request');

	let identifier = $state('');
	let requesting = $state(false);

	let code = $state('');
	let newPassword = $state('');
	let resetting = $state(false);

	async function handleRequest(event: SubmitEvent) {
		event.preventDefault();
		requesting = true;
		try {
			await requestPasswordReset(identifier);
			toast.push(t('forgotPassword.codeSent'), 'info');
			stage = 'reset';
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('forgotPassword.errorRequest'));
		} finally {
			requesting = false;
		}
	}

	async function handleReset(event: SubmitEvent) {
		event.preventDefault();
		resetting = true;
		try {
			await resetPassword({ identifier, code, newPassword });
			toast.push(t('forgotPassword.resetDone'), 'info');
			await goto('/welcome');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('forgotPassword.errorReset'));
		} finally {
			resetting = false;
		}
	}
</script>

<div class="forgot">
	<h1>{t('forgotPassword.title')}</h1>

	{#if required}
		<div class="banner">
			{t('forgotPassword.forcedBanner')}
		</div>
	{/if}

	{#if stage === 'request'}
		<p class="hint">{t('forgotPassword.requestHint')}</p>
		<form onsubmit={handleRequest}>
			<label>
				{t('forgotPassword.identifier')}
				<input type="text" bind:value={identifier} required />
			</label>
			<button type="submit" disabled={requesting}>
				{requesting ? t('forgotPassword.sending') : t('forgotPassword.sendCode')}
			</button>
		</form>
		<a class="link" href="/welcome">{t('forgotPassword.backToLogin')}</a>
	{:else}
		<p class="hint">{t('forgotPassword.resetHint')}</p>
		<form onsubmit={handleReset}>
			<label>
				{t('forgotPassword.resetCode')}
				<input
					type="text"
					inputmode="numeric"
					maxlength="6"
					bind:value={code}
					autocomplete="one-time-code"
					required
				/>
			</label>
			<label>
				{t('forgotPassword.newPassword')}
				<input type="password" bind:value={newPassword} required />
			</label>
			<button type="submit" disabled={resetting}>
				{resetting ? t('forgotPassword.resetting') : t('forgotPassword.resetPassword')}
			</button>
		</form>
		<button type="button" class="link" onclick={() => (stage = 'request')}>
			{t('forgotPassword.tryAgain')}
		</button>
		<a class="link" href="/welcome">{t('forgotPassword.backToLogin')}</a>
	{/if}
</div>

<style>
	.forgot {
		max-width: 360px;
		margin: 0 auto;
		padding: 2rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.hint {
		color: var(--ink-soft);
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.banner {
		background: var(--warn-soft);
		color: var(--warn);
		border-radius: 8px;
		padding: 0.7rem 0.8rem;
		font-size: 0.85rem;
		line-height: 1.5;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.85rem;
	}
	input {
		padding: 0.6rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 1rem;
		background: var(--paper-raised);
		color: var(--ink);
	}
	button[type='submit'] {
		padding: 0.7rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
		cursor: pointer;
	}
	.link {
		background: none;
		border: none;
		color: var(--accent);
		font-size: 0.85rem;
		text-decoration: underline;
		cursor: pointer;
		padding: 0;
		align-self: center;
	}
</style>
