<script lang="ts">
	import { goto } from '$app/navigation';
	import { logout } from '$lib/api/auth';
	import { deleteUser } from '$lib/api/users';
	import { session } from '$lib/state/session.svelte';
	import { theme } from '$lib/state/theme.svelte';
	import { palette } from '$lib/state/palette.svelte';
	import { PALETTES } from '$lib/theme/palettes';
	import { toast } from '$lib/state/toast.svelte';
	import { ApiError } from '$lib/api/client';

	let confirmingDelete = $state(false);
	let deleting = $state(false);

	async function handleLogout() {
		try {
			if (session.refreshToken) await logout(session.refreshToken);
		} catch {
			// A failed revoke call must not trap the user on their own device — still clear
			// local state and redirect regardless.
		} finally {
			await session.signOut();
			await goto('/welcome');
		}
	}

	async function handleDeleteAccount() {
		if (!session.user?._id) return;
		deleting = true;
		try {
			await deleteUser(session.user._id);
			await session.signOut();
			toast.push('Your account has been deleted', 'info');
			await goto('/welcome');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : 'Could not delete account');
			deleting = false;
		}
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

	<div class="section">
		<span class="section-label">Dark mode</span>
		<button
			type="button"
			class="switch"
			class:on={theme.current === 'dark'}
			role="switch"
			aria-checked={theme.current === 'dark'}
			aria-label="Dark mode"
			onclick={() => theme.toggle()}
		>
			<span class="knob"></span>
		</button>
	</div>

	<div class="section palette-section">
		<span class="section-label">Color palette</span>
		<div class="swatch-grid">
			{#each PALETTES as p (p.name)}
				{@const colors = p[theme.current]}
				<button
					type="button"
					class="swatch-btn"
					class:selected={palette.current === p.name}
					style:background={colors.paper}
					style:border-color={colors.line}
					onclick={() => palette.set(p.name, theme.current)}
					aria-label={p.name}
					title={p.name}
				>
					<span class="dot" style:background={colors.ink}></span>
					<span class="dot" style:background={colors.accent}></span>
					{#if palette.current === p.name}
						<span class="check" style:background={colors.accent} style:color={colors.paper}>✓</span>
					{/if}
				</button>
			{/each}
		</div>
		<p class="palette-name">{palette.current}</p>
	</div>

	<button type="button" class="outline" onclick={handleLogout}>Log out</button>

	<div class="legal-links">
		<a href="https://stokpot.ca/privacy" target="_blank" rel="noopener">Privacy Policy</a>
		<a href="https://stokpot.ca/terms" target="_blank" rel="noopener">Terms of Service</a>
	</div>

	<div class="danger-zone">
		{#if !confirmingDelete}
			<button type="button" class="danger-link" onclick={() => (confirmingDelete = true)}>
				Delete account
			</button>
		{:else}
			<p class="danger-copy">This can't be undone — your account will be permanently deleted.</p>
			<div class="danger-actions">
				<button type="button" class="outline" onclick={() => (confirmingDelete = false)}>
					Cancel
				</button>
				<button type="button" class="danger" onclick={handleDeleteAccount} disabled={deleting}>
					{deleting ? 'Deleting…' : 'Yes, delete my account'}
				</button>
			</div>
		{/if}
	</div>
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
		background: var(--accent-soft);
		color: var(--accent);
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
		color: var(--ink-soft);
	}
	.outline {
		padding: 0.7rem;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--paper-raised);
		color: var(--ink);
		font-weight: 600;
		cursor: pointer;
	}
	.section {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.5rem;
	}
	.section-label {
		font-size: 0.95rem;
		font-weight: 600;
	}
	.switch {
		width: 48px;
		height: 28px;
		padding: 3px;
		border: none;
		border-radius: 999px;
		background: var(--line);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		transition: background 0.15s ease;
	}
	.switch.on {
		background: var(--accent);
		justify-content: flex-end;
	}
	.switch .knob {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--paper-raised);
	}
	.palette-section {
		flex-direction: column;
		align-items: stretch;
		gap: 0.6rem;
	}
	.swatch-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.5rem;
	}
	.swatch-btn {
		position: relative;
		aspect-ratio: 1;
		border-radius: 10px;
		border: 1px solid var(--line);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		padding: 0;
	}
	.swatch-btn.selected {
		box-shadow: 0 0 0 2px var(--accent);
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex: 0 0 auto;
	}
	.check {
		position: absolute;
		top: -6px;
		right: -6px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6rem;
		font-weight: 700;
	}
	.palette-name {
		margin: 0;
		font-size: 0.8rem;
		color: var(--ink-soft);
	}
	.legal-links {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 0.5rem;
	}
	.legal-links a {
		font-size: 0.8rem;
		color: var(--ink-soft);
		text-decoration: underline;
	}
	.danger-zone {
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--line);
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.danger-link {
		align-self: flex-start;
		border: none;
		background: none;
		color: var(--bad);
		font-size: 0.85rem;
		text-decoration: underline;
		cursor: pointer;
		padding: 0;
	}
	.danger-copy {
		font-size: 0.85rem;
		color: var(--ink-soft);
		margin: 0;
		line-height: 1.5;
	}
	.danger-actions {
		display: flex;
		gap: 0.6rem;
	}
	.danger-actions .outline {
		flex: 1;
	}
	.danger {
		flex: 1;
		padding: 0.7rem;
		border-radius: 8px;
		border: 1px solid var(--bad);
		background: var(--paper-raised);
		color: var(--bad);
		font-weight: 600;
		cursor: pointer;
	}
</style>
