<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { restoreRevision, type RecipeRevision } from '$lib/api/recipes';
	import { ApiError } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { t, locale } from '$lib/i18n/index.svelte';
	import type { TranslationKey } from '$lib/i18n/translations';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let expanded = $state<string | null>(null);
	let restoring = $state<RecipeRevision | null>(null);
	let busy = $state(false);

	function when(iso: string) {
		return new Date(iso).toLocaleString(locale.current, { dateStyle: 'medium', timeStyle: 'short' });
	}

	function fields(rev: RecipeRevision) {
		return rev.changed.map((f) => t(`history.field.${f}` as TranslationKey)).join(', ');
	}

	async function confirmRestore() {
		if (!restoring) return;
		busy = true;
		try {
			await restoreRevision(data.recipe._id, restoring._id);
			await invalidate(`app:recipe:${data.recipe._id}`);
			toast.push(t('history.restored'), 'info');
			await goto(`/recipes/${data.recipe._id}`);
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('history.error'));
		} finally {
			busy = false;
			restoring = null;
		}
	}
</script>

<div class="page">
	<a class="back" href={`/recipes/${data.recipe._id}`}>‹ {data.recipe.title}</a>
	<h1>{t('history.title')}</h1>

	{#if data.revisions.length === 0}
		<p class="muted">{t('history.empty')}</p>
	{:else}
		<ol class="revisions">
			{#each data.revisions as rev (rev._id)}
				<li>
					<button type="button" class="rev-head" onclick={() => (expanded = expanded === rev._id ? null : rev._id)}>
						<span class="note">{rev.note ?? t('history.noNote')}</span>
						<span class="muted">{when(rev.editedAt)}</span>
						<span class="muted">{t('history.changed', { fields: fields(rev) })}</span>
					</button>
					{#if expanded === rev._id}
						<div class="before">
							<span class="label">{t('history.before')}</span>
							<strong>{rev.before.title}</strong>
							{#if rev.before.servings}<span class="muted">{t('recipes.servesCount', { count: rev.before.servings })}</span>{/if}
							<ol>
								{#each rev.before.instructions as step, i (i)}
									<li>{step}</li>
								{/each}
							</ol>
							<button type="button" class="restore" onclick={() => (restoring = rev)}>{t('history.restore')}</button>
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</div>

<ConfirmModal
	open={restoring !== null}
	title={t('history.restoreTitle')}
	message={t('history.restoreMessage')}
	confirmLabel={t('history.restore')}
	confirmingLabel={t('history.restoring')}
	cancelLabel={t('common.cancel')}
	confirming={busy}
	onConfirm={confirmRestore}
	onCancel={() => (restoring = null)}
/>

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.back {
		color: var(--accent);
		text-decoration: none;
		font-size: var(--text-sm);
	}
	h1 {
		margin: 0;
	}
	.muted {
		font-size: var(--text-xs);
		color: var(--ink-soft);
	}
	.revisions {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.revisions > li {
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--paper-raised);
		overflow: hidden;
	}
	.rev-head {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
		padding: 0.7rem 0.8rem;
		border: none;
		background: none;
		color: var(--ink);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.note {
		font-weight: 600;
	}
	.before {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0 0.8rem 0.8rem;
		border-top: 1px solid var(--line);
		font-size: var(--text-sm);
	}
	.label {
		margin-top: 0.5rem;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--ink-soft);
		text-transform: uppercase;
	}
	.before ol {
		margin: 0;
		padding-left: 1.2rem;
	}
	.restore {
		align-self: flex-start;
		margin-top: 0.3rem;
		border: 1px solid var(--accent);
		border-radius: 8px;
		background: var(--accent-soft);
		color: var(--accent);
		font: inherit;
		font-weight: 600;
		padding: 0.4rem 0.7rem;
		cursor: pointer;
	}
</style>
