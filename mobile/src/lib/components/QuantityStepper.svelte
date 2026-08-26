<script lang="ts">
	let {
		value = $bindable(1),
		min = 0,
		step = 1,
		decreaseLabel,
		increaseLabel,
		quantityLabel
	}: {
		value: number;
		min?: number;
		step?: number;
		decreaseLabel: string;
		increaseLabel: string;
		quantityLabel: string;
	} = $props();

	function round(n: number) {
		return Math.round(n * 100) / 100;
	}

	function decrease() {
		value = Math.max(min, round(value - step));
	}

	function increase() {
		value = round(value + step);
	}
</script>

<div class="stepper">
	<button
		type="button"
		class="step-btn"
		onclick={decrease}
		disabled={value <= min}
		aria-label={decreaseLabel}
	>
		−
	</button>
	<input type="number" inputmode="decimal" {min} {step} bind:value aria-label={quantityLabel} />
	<button type="button" class="step-btn" onclick={increase} aria-label={increaseLabel}> + </button>
</div>

<style>
	.stepper {
		display: flex;
		align-items: stretch;
		border: 1px solid var(--line);
		border-radius: 8px;
		overflow: hidden;
		background: var(--paper-raised);
	}
	.step-btn {
		flex: 0 0 auto;
		width: 2.4rem;
		border: none;
		background: none;
		color: var(--ink);
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
	}
	.step-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.stepper input {
		flex: 1;
		min-width: 0;
		width: 100%;
		border: none;
		border-left: 1px solid var(--line);
		border-right: 1px solid var(--line);
		border-radius: 0;
		text-align: center;
		background: transparent;
		color: var(--ink);
		font-size: 1rem;
		padding: 0.55rem 0.3rem;
	}
</style>
