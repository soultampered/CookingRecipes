<script lang="ts">
	import { Capacitor } from '@capacitor/core';
	import { Share } from '@capacitor/share';
	import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
	import { exportUserData } from '$lib/api/users';
	import { ApiError } from '$lib/api/client';
	import { session } from '$lib/state/session.svelte';
	import { toast } from '$lib/state/toast.svelte';
	import { t } from '$lib/i18n/index.svelte';

	// Web downloads; native writes to cache and opens the share sheet.
	let working = $state(false);

	async function run() {
		if (!session.user?._id) return;
		working = true;
		try {
			const data = await exportUserData(session.user._id);
			const json = JSON.stringify(data, null, 2);
			const name = `stokpot-export-${new Date().toISOString().slice(0, 10)}.json`;
			if (Capacitor.isNativePlatform()) {
				const file = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
				await Share.share({ title: name, files: [file.uri] }).catch(() => {});
			} else {
				const href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
				const a = document.createElement('a');
				a.href = href;
				a.download = name;
				a.click();
				setTimeout(() => URL.revokeObjectURL(href), 1000);
			}
			toast.push(t('export.done'), 'info');
		} catch (err) {
			toast.push(err instanceof ApiError ? err.message : t('export.error'));
		} finally {
			working = false;
		}
	}
</script>

<div class="export">
	<div class="text">
		<span class="label">{t('export.title')}</span>
		<span class="hint">{t('export.hint')}</span>
	</div>
	<button type="button" onclick={run} disabled={working}>{working ? t('export.working') : t('export.button')}</button>
</div>

<style>
	.export {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}
	.text {
		display: flex;
		flex-direction: column;
	}
	.label {
		font-size: 0.95rem;
		font-weight: 600;
	}
	.hint {
		font-size: 0.78rem;
		color: var(--ink-soft);
	}
	button {
		flex: 0 0 auto;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper-raised);
		color: var(--ink);
		font: inherit;
		font-size: 0.85rem;
		padding: 0.45rem 0.75rem;
		cursor: pointer;
	}
</style>
