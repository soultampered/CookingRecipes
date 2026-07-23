<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { requestPasswordReset, resetPassword } from '$lib/api/auth';
	import { toast } from '$lib/state/toast.svelte';
	import { ApiError } from '$lib/api/client';

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
			toast.push('If that account exists, a reset code has been sent', 'info');
			stage = 'reset';
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not request reset code');
		} finally {
			requesting = false;
		}
	}

	async function handleReset(event: SubmitEvent) {
		event.preventDefault();
		resetting = true;
		try {
			await resetPassword({ identifier, code, newPassword });
			toast.push('Password reset — log in with your new password', 'info');
			await goto('/welcome');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not reset password');
		} finally {
			resetting = false;
		}
	}
</script>

<div class="forgot">
	<h1>Reset your password</h1>

	{#if required}
		<div class="banner">
			We detected unusual activity on your account and require a password reset before you
			can continue.
		</div>
	{/if}

	{#if stage === 'request'}
		<p class="hint">Enter your username or email and we'll send you a reset code.</p>
		<form onsubmit={handleRequest}>
			<label>
				Username or email
				<input type="text" bind:value={identifier} required />
			</label>
			<button type="submit" disabled={requesting}>
				{requesting ? 'Sending…' : 'Send reset code'}
			</button>
		</form>
		<a class="link" href="/welcome">Back to Login</a>
	{:else}
		<p class="hint">Enter the code we sent you, plus a new password.</p>
		<form onsubmit={handleReset}>
			<label>
				Reset code
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
				New password
				<input type="password" bind:value={newPassword} required />
			</label>
			<button type="submit" disabled={resetting}>
				{resetting ? 'Resetting…' : 'Reset password'}
			</button>
		</form>
		<button type="button" class="link" onclick={() => (stage = 'request')}>
			Didn't get a code? Try again
		</button>
		<a class="link" href="/welcome">Back to Login</a>
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
