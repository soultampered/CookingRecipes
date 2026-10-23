<script lang="ts">
	import { onMount } from 'svelte';
	import {
		addToCollection,
		createCollection,
		listCollections,
		removeFromCollection,
		type RecipeCollection
	} from '$lib/api/collections';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';

	// Toggle collection membership; create inline.
	let { recipeId, onClose }: { recipeId: string; onClose: () => void } = $props();

	let collections = $state<RecipeCollection[] | null>(null);
	let newName = $state('');
	let busy = $state(false);

	onMount(async () => {
		try {
			collections = await listCollections();
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('collections.error'));
			onClose();
		}
	});

	async function toggle(c: RecipeCollection) {
		busy = true;
		try {
			const updated = c.recipeIds.includes(recipeId)
				? await removeFromCollection(c._id, recipeId)
				: await addToCollection(c._id, recipeId);
			collections = collections!.map((x) => (x._id === c._id ? updated : x));
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('collections.error'));
		} finally {
			busy = false;
		}
	}

	async function create(e: SubmitEvent) {
		e.preventDefault();
		const name = newName.trim();
		if (!name) return;
		busy = true;
		try {
			const created = await createCollection(name);
			const withRecipe = await addToCollection(created._id, recipeId);
			collections = [...(collections ?? []), withRecipe].sort((a, b) => a.name.localeCompare(b.name));
			newName = '';
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('collections.error'));
		} finally {
			busy = false;
		}
	}
</script>

<div
	class="backdrop"
	role="presentation"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
>
	<div class="picker" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
		<h2>{t('collections.pickerTitle')}</h2>
		{#if collections === null}
			<p class="hint">{t('sessions.loading')}</p>
		{:else if collections.length === 0}
			<p class="hint">{t('collections.empty')}</p>
		{:else}
			<ul>
				{#each collections as c (c._id)}
					<li>
						<label>
							<input type="checkbox" checked={c.recipeIds.includes(recipeId)} disabled={busy} onchange={() => toggle(c)} />
							{c.name}
						</label>
					</li>
				{/each}
			</ul>
		{/if}
		<form onsubmit={create}>
			<input type="text" maxlength="80" placeholder={t('collections.newPlaceholder')} bind:value={newName} />
			<button type="submit" disabled={busy || !newName.trim()}>{t('collections.create')}</button>
		</form>
		<button type="button" class="done" onclick={onClose}>{t('collections.done')}</button>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.25rem;
		z-index: 100;
	}
	.picker {
		width: 100%;
		max-width: 340px;
		max-height: 80vh;
		overflow-y: auto;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	h2 {
		margin: 0;
		font-size: 1rem;
	}
	.hint {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--ink-soft);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-sm);
	}
	form {
		display: flex;
		gap: 0.4rem;
	}
	form input {
		flex: 1;
		min-width: 0;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
	}
	form button,
	.done {
		border: none;
		border-radius: 8px;
		padding: 0.45rem 0.75rem;
		background: var(--accent);
		color: var(--paper-raised);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	form button:disabled {
		opacity: 0.5;
	}
	.done {
		background: var(--paper);
		color: var(--ink);
		border: 1px solid var(--line);
	}
</style>
