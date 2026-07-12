<script lang="ts">
	import { goto } from '$app/navigation';
	import { session } from '$lib/state/session.svelte';

	async function handleLogout() {
		await session.signOut();
		await goto('/welcome');
	}
</script>

<div class="account">
	<h1>Account</h1>

	{#if session.user}
		<div class="profile">
			<div class="avatar">{session.user.username.charAt(0).toUpperCase()}</div>
			<div>
				<div class="username">{session.user.username}</div>
				<div class="email">{session.user.email}</div>
			</div>
		</div>
	{/if}

	<button type="button" class="outline" onclick={handleLogout}>Log out</button>
</div>

<style>
	.account {
		max-width: 360px;
		margin: 0 auto;
		padding: 1.5rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.profile {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: #f4e9ee;
		color: #6e3550;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}
	.username {
		font-weight: 600;
	}
	.email {
		font-size: 0.85rem;
		color: #666;
	}
	.outline {
		padding: 0.7rem;
		border-radius: 8px;
		border: 1px solid #ccc;
		background: none;
		font-weight: 600;
		cursor: pointer;
	}
</style>
