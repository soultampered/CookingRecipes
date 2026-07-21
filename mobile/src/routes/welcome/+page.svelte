<script lang="ts">
	import { goto } from '$app/navigation';
	import { login, register } from '$lib/api/auth';
	import { session } from '$lib/state/session.svelte';
	import { toast } from '$lib/state/toast.svelte';
	import { ApiError } from '$lib/api/client';
	import type { User } from '$lib/types/user';

	function postAuthRedirect(user: User) {
		if (user.mustResetPassword) return goto('/forgot-password?required=1');
		if (!user.emailVerified) return goto('/verify-email');
		return goto('/dashboard');
	}

	let mode = $state<'login' | 'register'>('login');

	let identifier = $state('');
	let loginPassword = $state('');
	let loggingIn = $state(false);

	let username = $state('');
	let email = $state('');
	let registerPassword = $state('');
	let registering = $state(false);

	async function handleLogin(event: SubmitEvent) {
		event.preventDefault();
		loggingIn = true;
		try {
			const result = await login({ identifier, password: loginPassword });
			await session.signIn(result);
			await postAuthRedirect(result.user);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not log in');
		} finally {
			loggingIn = false;
		}
	}

	async function handleRegister(event: SubmitEvent) {
		event.preventDefault();
		registering = true;
		try {
			const result = await register({ username, email, password: registerPassword });
			await session.signIn(result);
			await postAuthRedirect(result.user);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not create account');
		} finally {
			registering = false;
		}
	}
</script>

<div class="welcome">
	<h1>Welcome to Larder</h1>

	<div class="tabs">
		<button type="button" class:active={mode === 'login'} onclick={() => (mode = 'login')}>
			Log in
		</button>
		<button type="button" class:active={mode === 'register'} onclick={() => (mode = 'register')}>
			Create account
		</button>
	</div>

	{#if mode === 'login'}
		<form onsubmit={handleLogin}>
			<label>
				Username or email
				<input type="text" bind:value={identifier} required />
			</label>
			<label>
				Password
				<input type="password" bind:value={loginPassword} required />
			</label>
			<button type="submit" disabled={loggingIn}>{loggingIn ? 'Logging in…' : 'Log in'}</button>
		</form>
		<a class="link" href="/forgot-password">Forgot password?</a>
	{:else}
		<form onsubmit={handleRegister}>
			<label>
				Username
				<input type="text" bind:value={username} required />
			</label>
			<label>
				Email
				<input type="email" bind:value={email} required />
			</label>
			<label>
				Password
				<input type="password" bind:value={registerPassword} required />
			</label>
			<button type="submit" disabled={registering}>
				{registering ? 'Creating…' : 'Create account'}
			</button>
		</form>
	{/if}
</div>

<style>
	.welcome {
		max-width: 360px;
		margin: 0 auto;
		padding: 2rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.tabs {
		display: flex;
		border: 1px solid var(--line);
		border-radius: 8px;
		overflow: hidden;
	}
	.tabs button {
		flex: 1;
		padding: 0.6rem;
		background: var(--paper-raised);
		border: none;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--ink-soft);
		cursor: pointer;
	}
	.tabs button.active {
		background: var(--accent);
		color: var(--paper-raised);
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
		align-self: center;
		color: var(--accent);
		font-size: 0.85rem;
		text-decoration: underline;
	}
</style>
