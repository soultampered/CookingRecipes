<script lang="ts">
	import { onDestroy } from 'svelte';
	import { t } from '$lib/i18n/index.svelte';

	let { seconds }: { seconds: number } = $props();

	let remaining = $state(seconds);
	let running = $state(false);
	let done = $state(false);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	function format(s: number): string {
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${sec.toString().padStart(2, '0')}`;
	}

	function start() {
		if (running) return;
		running = true;
		done = false;
		intervalId = setInterval(() => {
			remaining -= 1;
			if (remaining <= 0) {
				remaining = 0;
				stopInterval();
				done = true;
			}
		}, 1000);
	}

	function stopInterval() {
		running = false;
		if (intervalId) clearInterval(intervalId);
		intervalId = null;
	}

	function reset() {
		stopInterval();
		remaining = seconds;
		done = false;
	}

	onDestroy(stopInterval);
</script>

<div class="step-timer" class:done>
	<span class="time">{format(remaining)}</span>
	{#if running}
		<button type="button" onclick={stopInterval}>{t('stepTimer.pause')}</button>
	{:else}
		<button type="button" onclick={start}>
			{done ? t('stepTimer.restart') : remaining < seconds ? t('stepTimer.resume') : t('stepTimer.start')}
		</button>
	{/if}
	{#if remaining < seconds && !running}
		<button type="button" class="reset" onclick={reset}>{t('stepTimer.reset')}</button>
	{/if}
</div>

<style>
	.step-timer {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.3rem;
		padding: 0.25rem 0.5rem;
		border-radius: 999px;
		background: var(--accent-soft);
		font-size: 0.78rem;
	}
	.step-timer.done {
		background: var(--good-soft);
	}
	.time {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		color: var(--accent);
		min-width: 2.5em;
	}
	.step-timer.done .time {
		color: var(--good);
	}
	.step-timer button {
		border: none;
		background: none;
		color: var(--accent);
		font-weight: 600;
		font-size: 0.78rem;
		cursor: pointer;
		padding: 0;
	}
	.step-timer .reset {
		color: var(--ink-soft);
		font-weight: 500;
	}
</style>
