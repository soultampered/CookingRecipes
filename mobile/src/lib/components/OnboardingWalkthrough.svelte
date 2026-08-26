<script lang="ts">
	import { t } from '$lib/i18n/index.svelte';
	import { onboarding } from '$lib/state/onboarding.svelte';

	const steps = [
		{ title: t('onboarding.step1Title'), body: t('onboarding.step1Body') },
		{ title: t('onboarding.step2Title'), body: t('onboarding.step2Body') },
		{ title: t('onboarding.step3Title'), body: t('onboarding.step3Body') },
		{ title: t('onboarding.step4Title'), body: t('onboarding.step4Body') }
	];

	let index = $state(0);
	let lastStep = $derived(index === steps.length - 1);

	function next() {
		if (lastStep) onboarding.dismiss();
		else index += 1;
	}
</script>

<div class="backdrop" role="presentation">
	<div class="card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
		<button type="button" class="skip" onclick={() => onboarding.dismiss()}>
			{t('onboarding.skip')}
		</button>
		<h2 id="onboarding-title">{steps[index].title}</h2>
		<p>{steps[index].body}</p>
		<div class="dots">
			{#each steps as _, i}
				<span class="dot" class:active={i === index}></span>
			{/each}
		</div>
		<button type="button" class="primary" onclick={next}>
			{lastStep ? t('onboarding.getStarted') : t('onboarding.next')}
		</button>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		z-index: 200;
	}
	.card {
		position: relative;
		width: 100%;
		max-width: 340px;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 1.75rem 1.5rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		text-align: center;
	}
	.skip {
		position: absolute;
		top: 0.75rem;
		right: 0.9rem;
		border: none;
		background: none;
		color: var(--ink-soft);
		font-size: 0.8rem;
		cursor: pointer;
	}
	h2 {
		margin: 0.5rem 0 0;
		font-size: 1.15rem;
	}
	p {
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.dots {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
		margin: 0.3rem 0;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--line);
	}
	.dot.active {
		background: var(--accent);
	}
	.primary {
		padding: 0.7rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: var(--paper-raised);
		font-weight: 600;
		cursor: pointer;
	}
</style>
