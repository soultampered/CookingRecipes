<script lang="ts">
	let { name }: { name: string } = $props();
</script>

<svg
	width="20"
	height="20"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	{#if name === 'dashboard'}
		<rect x="3" y="3" width="7" height="7" rx="1.5" />
		<rect x="14" y="3" width="7" height="7" rx="1.5" />
		<rect x="3" y="14" width="7" height="7" rx="1.5" />
		<rect x="14" y="14" width="7" height="7" rx="1.5" />
	{:else if name === 'recipes'}
		<path d="M12 6c-1.5-1.5-4-2-8-2v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2V4c-4 0-6.5.5-8 2z" />
		<path d="M12 6v14" />
	{:else if name === 'inventory'}
		<path d="M3 8l9-5 9 5-9 5-9-5z" />
		<path d="M3 8v8l9 5 9-5V8" />
		<path d="M12 13v8" />
	{:else if name === 'suggestions'}
		<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
	{:else if name === 'shopping'}
		<path d="M3 4h2l2.2 11h10.6L20 8H6.2" />
		<circle cx="9" cy="19" r="1.4" />
		<circle cx="17" cy="19" r="1.4" />
	{:else if name === 'account'}
		<circle cx="12" cy="8" r="3.5" />
		<path d="M4.5 20c1.5-4 5-6 7.5-6s6 2 7.5 6" />
	{/if}
</svg>
