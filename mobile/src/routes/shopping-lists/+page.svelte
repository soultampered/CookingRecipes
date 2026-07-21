<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function uncheckedCount(items: { checked?: boolean }[]) {
		return items.filter((i) => !i.checked).length;
	}
</script>

<div class="page">
	<div class="header">
		<h1>Shopping Lists</h1>
		<a class="btn-outline" href="/shopping-lists/new">+ New list</a>
	</div>

	{#if data.lists.length === 0}
		<p class="empty">No shopping lists yet.</p>
	{:else}
		<div class="list">
			{#each data.lists as list (list._id)}
				<a class="card" href={`/shopping-lists/${list._id}`}>
					<div class="card-title">{list.name}</div>
					<div class="card-meta">
						{list.items.length} item{list.items.length === 1 ? '' : 's'}
						{#if uncheckedCount(list.items) > 0}
							· {uncheckedCount(list.items)} left
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.btn-outline {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		text-decoration: none;
		color: var(--ink);
		background: var(--paper-raised);
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.card {
		display: block;
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 0.8rem 0.9rem;
		text-decoration: none;
		color: inherit;
		background: var(--paper-raised);
	}
	.card-title {
		font-weight: 600;
	}
	.card-meta {
		font-size: 0.8rem;
		color: var(--ink-soft);
		margin-top: 0.25rem;
	}
	.empty {
		color: var(--ink-soft);
		font-size: 0.9rem;
	}
</style>
