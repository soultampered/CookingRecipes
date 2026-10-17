<script lang="ts">
	import { uploadPhoto } from '$lib/api/photos';
	import { ApiError, photoUrl } from '$lib/api/client';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { compressImage } from '$lib/utils/image';

	// Plain file input: the OS offers camera or library.
	let { value = $bindable(null), alt }: { value: string | null; alt: string } = $props();

	let input: HTMLInputElement | undefined = $state();
	let uploading = $state(false);

	async function onPick(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		(e.target as HTMLInputElement).value = '';
		if (!file) return;
		uploading = true;
		try {
			const { id } = await uploadPhoto(await compressImage(file));
			value = id;
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('photo.error'));
		} finally {
			uploading = false;
		}
	}
</script>

<div class="photo-picker">
	{#if value}
		<img src={photoUrl(value)} {alt} />
	{/if}
	<div class="actions">
		<button type="button" disabled={uploading} onclick={() => input?.click()}>
			{uploading ? t('photo.uploading') : value ? t('photo.change') : t('photo.add')}
		</button>
		{#if value}
			<button type="button" class="remove" disabled={uploading} onclick={() => (value = null)}>{t('photo.remove')}</button>
		{/if}
	</div>
	<input bind:this={input} type="file" accept="image/*" hidden onchange={onPick} />
</div>

<style>
	.photo-picker {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	img {
		width: 100%;
		max-height: 200px;
		object-fit: cover;
		border-radius: 10px;
		border: 1px solid var(--line);
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	button {
		border: 1px dashed var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
		font-size: var(--text-sm);
		padding: 0.45rem 0.75rem;
		cursor: pointer;
	}
	.remove {
		border-style: solid;
		color: var(--bad);
	}
</style>
