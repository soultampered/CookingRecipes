import { locale } from '$lib/i18n/index.svelte';

// STO-81: Stokpot is Canadian (stokpot.ca) — CAD formatted per the app's language.
export function money(n: number): string {
	return new Intl.NumberFormat(`${locale.current}-CA`, { style: 'currency', currency: 'CAD' }).format(n);
}
