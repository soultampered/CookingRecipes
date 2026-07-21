<script lang="ts">
	import { goto } from '$app/navigation';
	import { resendCode, verifyEmail } from '$lib/api/auth';
	import { session } from '$lib/state/session.svelte';
	import { toast } from '$lib/state/toast.svelte';
	import { ApiError } from '$lib/api/client';

	let code = $state('');
	let verifying = $state(false);
	let resending = $state(false);

	async function handleVerify(event: SubmitEvent) {
		event.preventDefault();
		verifying = true;
		try {
			const user = await verifyEmail(code);
			session.setUser(user);
			await goto('/dashboard');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not verify code');
		} finally {
			verifying = false;
		}
	}

	async function handleResend() {
		resending = true;
		try {
			await resendCode();
			toast.push('New code sent', 'info');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not resend code');
		} finally {
			resending = false;
		}
	}
</script>

<div class="verify">
	<h1>Check your email</h1>
	<p class="hint">
		We sent a 6-digit code to {session.user?.email ?? 'your email'}. Enter it below to finish
		setting up your account.
	</p>

	<form onsubmit={handleVerify}>
		<label>
			Verification code
			<input
				type="text"
				inputmode="numeric"
				maxlength="6"
				bind:value={code}
				autocomplete="one-time-code"
				required
			/>
		</label>
		<button type="submit" disabled={verifying}>{verifying ? 'Verifying…' : 'Verify'}</button>
	</form>

	<button type="button" class="link" onclick={handleResend} disabled={resending}>
		{resending ? 'Sending…' : 'Resend code'}
	</button>
</div>

<style>
	.verify {
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
		font-size: 1.2rem;
		letter-spacing: 0.2em;
		text-align: center;
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
