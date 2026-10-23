import { locale } from '$lib/i18n/index.svelte';

// CAD, formatted per the app's language.
export function money(n: number): string {
	return new Intl.NumberFormat(`${locale.current}-CA`, { style: 'currency', currency: 'CAD' }).format(n);
}
