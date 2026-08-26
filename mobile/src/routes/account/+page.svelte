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
	import { categoryOrder } from '$lib/state/categoryOrder.svelte';
	import { expirySettings } from '$lib/state/expirySettings.svelte';
	import { t, tRaw, locale } from '$lib/i18n/index.svelte';
	import { dragToReorder } from '$lib/utils/dragToReorder.svelte';
	import type { Locale } from '$lib/i18n/translations';

	const categoryDrag = dragToReorder();
	function registerCategoryRef(node: HTMLElement, id: string) {
		categoryDrag.registerRef(id, node);
		return {
			destroy() {
				categoryDrag.registerRef(id, null);
			}
		};
	}

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
			toast.push(t('account.deleted'), 'info');
			await goto('/welcome');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('account.errorDelete'));
			deleting = false;
		}
	}

	const LANGUAGES: { value: Locale; label: string }[] = [
		{ value: 'en', label: 'English' },
		{ value: 'fr', label: 'Français' }
	];
</script>

<div class="account">
	<h1>{t('account.title')}</h1>

	{#if session.user}
		<div class="profile">
			<div class="avatar">{session.user.username.charAt(0).toUpperCase()}</div>
			<div class="profile-text">
				<div class="username">{session.user.username}</div>
				<div class="email">{session.user.email}</div>
			</div>
		</div>
	{/if}

	<div class="section">
		<span class="section-label">{t('account.darkMode')}</span>
		<button
			type="button"
			class="switch"
			class:on={theme.current === 'dark'}
			role="switch"
			aria-checked={theme.current === 'dark'}
			aria-label={t('account.darkMode')}
			onclick={() => theme.toggle()}
		>
			<span class="knob"></span>
		</button>
	</div>

	<div class="section language-section">
		<span class="section-label">{t('account.language')}</span>
		<div class="language-options">
			{#each LANGUAGES as lang (lang.value)}
				<button
					type="button"
					class="language-btn"
					class:active={locale.current === lang.value}
					onclick={() => locale.set(lang.value)}
				>
					{lang.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="section palette-section">
		<span class="section-label">{t('account.colorPalette')}</span>
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

	<div class="section expiry-section">
		<span class="section-label">{t('account.expirationAlerts')}</span>
		<p class="section-hint">{t('account.expirationHint')}</p>
		<label class="expiry-input-row">
			<input
				type="number"
				min="0"
				value={expirySettings.daysAhead}
				onchange={(e) => expirySettings.set(Number(e.currentTarget.value) || 0)}
			/>
			<span>{t('account.days')}</span>
		</label>
	</div>

	<div class="section category-order-section">
		<span class="section-label">{t('account.shoppingListOrder')}</span>
		<p class="section-hint">{t('account.shoppingListOrderHint')}</p>
		<div class="category-order-list">
			{#each categoryOrder.current as category (category)}
				<div
					class="category-order-row"
					class:dragging={categoryDrag.isDragging(category)}
					use:registerCategoryRef={category}
					style:transform={`translateY(${categoryDrag.offsetFor(category, [...categoryOrder.current])}px)`}
				>
					<button
						type="button"
						class="drag-handle"
						aria-label={t('recipeForm.dragToReorder')}
						onpointerdown={(e) => categoryDrag.onPointerDown(e, category, [...categoryOrder.current])}
						onpointermove={(e) => categoryDrag.onPointerMove(e, category, [...categoryOrder.current])}
						onpointerup={() =>
							categoryDrag.onPointerUp(category, (from, to) => categoryOrder.reorder(from, to))}
						onpointercancel={() => categoryDrag.cancel()}
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
							<circle cx="9" cy="6" r="1.8" />
							<circle cx="15" cy="6" r="1.8" />
							<circle cx="9" cy="12" r="1.8" />
							<circle cx="15" cy="12" r="1.8" />
							<circle cx="9" cy="18" r="1.8" />
							<circle cx="15" cy="18" r="1.8" />
						</svg>
					</button>
					<span class="category-order-name">{tRaw('category', category)}</span>
				</div>
			{/each}
		</div>
	</div>

	<button type="button" class="outline" onclick={handleLogout}>{t('account.logOut')}</button>

	<div class="legal-links">
		<a href="https://stokpot.ca/privacy" target="_blank" rel="noopener">{t('account.privacyPolicy')}</a>
		<a href="https://stokpot.ca/terms" target="_blank" rel="noopener">{t('account.termsOfService')}</a>
	</div>

	<div class="danger-zone">
		{#if !confirmingDelete}
			<button type="button" class="danger-link" onclick={() => (confirmingDelete = true)}>
				{t('account.deleteAccount')}
			</button>
		{:else}
			<p class="danger-copy">{t('account.deleteWarning')}</p>
			<div class="danger-actions">
				<button type="button" class="outline" onclick={() => (confirmingDelete = false)}>
					{t('common.cancel')}
				</button>
				<button type="button" class="danger" onclick={handleDeleteAccount} disabled={deleting}>
					{deleting ? t('common.deleting') : t('account.confirmDelete')}
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
	.profile-text {
		flex: 1;
		min-width: 0;
	}
	.username {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.email {
		font-size: 0.85rem;
		color: var(--ink-soft);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
	.category-order-section,
	.expiry-section,
	.language-section {
		flex-direction: column;
		align-items: stretch;
		gap: 0.5rem;
	}
	.language-options {
		display: flex;
		gap: 0.5rem;
	}
	.language-btn {
		flex: 1;
		padding: 0.55rem;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--paper-raised);
		color: var(--ink);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}
	.language-btn.active {
		background: var(--accent);
		color: var(--paper-raised);
		border-color: var(--accent);
	}
	.expiry-input-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}
	.expiry-input-row input {
		width: 70px;
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 0.95rem;
		background: var(--paper-raised);
		color: var(--ink);
	}
	.section-hint {
		margin: 0;
		font-size: 0.78rem;
		color: var(--ink-soft);
	}
	.category-order-list {
		display: flex;
		flex-direction: column;
		max-height: 260px;
		overflow-y: auto;
		border: 1px solid var(--line);
		border-radius: 8px;
	}
	.category-order-row {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.5rem 0.7rem;
		border-bottom: 1px solid var(--line);
		background: var(--paper-raised);
		transition: transform 0.2s ease;
	}
	.category-order-row:last-child {
		border-bottom: none;
	}
	.category-order-row.dragging {
		z-index: 10;
		box-shadow: 0 6px 16px -4px rgba(0, 0, 0, 0.35);
		transition: none;
	}
	.drag-handle {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.2rem;
		height: 2.2rem;
		border: none;
		background: none;
		color: var(--ink-soft);
		cursor: grab;
		touch-action: none;
	}
	.category-order-row.dragging .drag-handle {
		cursor: grabbing;
	}
	.category-order-name {
		font-size: 0.85rem;
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
