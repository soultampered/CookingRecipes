<script lang="ts">
	import { PALETTES, type Mode } from '$lib/theme/palettes';

	// Custom dropdown: <select> can't render swatches.
	let {
		value,
		mode,
		label,
		onSelect
	}: { value: string; mode: Mode; label: string; onSelect: (name: string) => void } = $props();

	let open = $state(false);
	let highlighted = $state(0);
	let root: HTMLDivElement | undefined = $state();
	let listEl: HTMLUListElement | undefined = $state();

	let current = $derived(PALETTES.find((p) => p.name === value) ?? PALETTES[0]);

	function toggle() {
		open = !open;
		if (open) {
			highlighted = Math.max(0, PALETTES.findIndex((p) => p.name === value));
			queueMicrotask(() => listEl?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
		}
	}

	function choose(name: string) {
		onSelect(name);
		open = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (!open) {
			if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				toggle();
			}
			return;
		}
		if (e.key === 'Escape') {
			open = false;
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlighted = Math.min(PALETTES.length - 1, highlighted + 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlighted = Math.max(0, highlighted - 1);
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			choose(PALETTES[highlighted].name);
		}
	}

	$effect(() => {
		if (!open) return;
		const onOutside = (e: PointerEvent) => {
			if (root && !root.contains(e.target as Node)) open = false;
		};
		document.addEventListener('pointerdown', onOutside);
		return () => document.removeEventListener('pointerdown', onOutside);
	});
</script>

{#snippet swatch(colors: { ink: string; paper: string; line: string; accent: string })}
	<span class="swatch" style:background={colors.paper} style:border-color={colors.line}>
		<span class="dot" style:background={colors.ink}></span>
		<span class="dot" style:background={colors.accent}></span>
	</span>
{/snippet}

<div class="picker" bind:this={root}>
	<button
		type="button"
		class="trigger"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label={label}
		onclick={toggle}
		onkeydown={onKeydown}
	>
		{@render swatch(current[mode])}
		<span class="name">{current.name}</span>
		<span class="chevron" class:open aria-hidden="true">▾</span>
	</button>

	{#if open}
		<ul class="options" role="listbox" aria-label={label} bind:this={listEl}>
			{#each PALETTES as p, i (p.name)}
				<li
					role="option"
					aria-selected={p.name === value}
					class:highlighted={i === highlighted}
					onpointerenter={() => (highlighted = i)}
					onclick={() => choose(p.name)}
					onkeydown={onKeydown}
				>
					{@render swatch(p[mode])}
					<span class="option-text">
						<span class="name">{p.name}</span>
						<span class="mood">{p.mood}</span>
					</span>
					{#if p.name === value}<span class="check" aria-hidden="true">✓</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.picker {
		position: relative;
	}
	.trigger {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
		cursor: pointer;
		text-align: left;
	}
	.chevron {
		margin-left: auto;
		transition: transform 0.15s ease;
	}
	.chevron.open {
		transform: rotate(180deg);
	}
	.options {
		position: absolute;
		z-index: 50;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		max-height: 300px;
		overflow-y: auto;
		margin: 0;
		padding: 0.25rem;
		list-style: none;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 10px;
		box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.35);
	}
	li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.45rem 0.5rem;
		border-radius: 8px;
		cursor: pointer;
	}
	li.highlighted {
		background: var(--accent-soft);
	}
	.swatch {
		flex: 0 0 auto;
		width: 34px;
		height: 24px;
		border: 1px solid;
		border-radius: 6px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 3px;
	}
	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
	}
	.option-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.name {
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.mood {
		font-size: var(--text-xs);
		color: var(--ink-soft);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.check {
		margin-left: auto;
		color: var(--accent);
		font-weight: 700;
	}
</style>
