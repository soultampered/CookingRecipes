<script lang="ts">
	import { setTwoFactor } from '$lib/api/auth';
	import { ApiError } from '$lib/api/client';
	import { session } from '$lib/state/session.svelte';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';

	// Both directions need the password.
	let confirming = $state(false);
	let password = $state('');
	let saving = $state(false);
	let enabled = $derived(session.user?.twoFactorEnabled ?? false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		try {
			const user = await setTwoFactor(!enabled, password);
			session.setUser(user);
			toast.push(t(user.twoFactorEnabled ? 'twoFactor.enabled' : 'twoFactor.disabled'), 'info');
			confirming = false;
			password = '';
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('twoFactor.error'));
		} finally {
			saving = false;
		}
	}
</script>

<div class="two-factor">
	<div class="row">
		<div class="text">
			<span class="label">{t('twoFactor.title')}</span>
			<span class="hint">{t('twoFactor.hint')}</span>
		</div>
		<button
			type="button"
			class="switch"
			class:on={enabled}
			role="switch"
			aria-checked={enabled}
			aria-label={t('twoFactor.title')}
			onclick={() => (confirming = !confirming)}
		>
			<span class="knob"></span>
		</button>
	</div>
	{#if confirming}
		<form onsubmit={submit}>
			<input
				type="password"
				placeholder={t('twoFactor.confirmPassword')}
				aria-label={t('twoFactor.confirmPassword')}
				bind:value={password}
				required
			/>
			<button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
		</form>
	{/if}
</div>

<style>
	.two-factor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.text {
		display: flex;
		flex-direction: column;
	}
	.label {
		font-size: 0.95rem;
		font-weight: 600;
	}
	.hint {
		font-size: 0.78rem;
		color: var(--ink-soft);
	}
	form {
		display: flex;
		gap: 0.5rem;
	}
	input {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
	}
	form button {
		border: none;
		border-radius: 8px;
		padding: 0.5rem 0.8rem;
		background: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
		cursor: pointer;
	}
	.switch {
		position: relative;
		width: 44px;
		height: 26px;
		flex: 0 0 auto;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: var(--paper);
		cursor: pointer;
		padding: 0;
	}
	.switch.on {
		background: var(--accent);
		border-color: var(--accent);
	}
	.knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--paper-raised);
		transition: transform 0.15s ease;
	}
	.switch.on .knob {
		transform: translateX(18px);
	}
</style>
