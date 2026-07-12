<script lang="ts">
	import { goto } from '$app/navigation';
	import { createUser, getUser } from '$lib/api/users';
	import { session } from '$lib/state/session.svelte';
	import { toast } from '$lib/state/toast.svelte';
	import { ApiError } from '$lib/api/client';

	let username = $state('');
	let email = $state('');
	let password = $state('');
	let creating = $state(false);

	let showRestore = $state(false);
	let restoreId = $state('');
	let restoring = $state(false);

	async function handleCreate(event: SubmitEvent) {
		event.preventDefault();
		creating = true;
		try {
			const user = await createUser({ username, email, password });
			await session.signIn(user);
			await goto('/recipes');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not create account');
		} finally {
			creating = false;
		}
	}

	async function handleRestore(event: SubmitEvent) {
		event.preventDefault();
		restoring = true;
		try {
			const user = await getUser(restoreId.trim());
			await session.signIn(user);
			await goto('/recipes');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'User not found');
		} finally {
			restoring = false;
		}
	}
</script>

<div class="welcome">
	<h1>Welcome to Larder</h1>
	<p class="hint">
		There's no login system yet — creating an account here is what makes one. Do it once; the app
		remembers you on this device from then on.
	</p>

	<form onsubmit={handleCreate}>
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
			<input type="password" bind:value={password} required />
		</label>
		<button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Start cooking'}</button>
	</form>

	<button type="button" class="link" onclick={() => (showRestore = !showRestore)}>
		Already have an ID? Restore access
	</button>

	{#if showRestore}
		<form onsubmit={handleRestore}>
			<label>
				User ID
				<input type="text" bind:value={restoreId} required />
			</label>
			<button type="submit" disabled={restoring}>{restoring ? 'Checking…' : 'Restore'}</button>
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
	.hint {
		color: #666;
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
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 1rem;
	}
	button[type='submit'] {
		padding: 0.7rem;
		border-radius: 8px;
		border: none;
		background: #6e3550;
		color: white;
		font-weight: 600;
	}
	button.link {
		background: none;
		border: none;
		color: #6e3550;
		font-size: 0.85rem;
		text-decoration: underline;
		cursor: pointer;
		padding: 0;
	}
</style>
