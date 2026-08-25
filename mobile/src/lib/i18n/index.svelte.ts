import { Preferences } from '@capacitor/preferences';
import { translations, type Locale, type TranslationKey } from './translations';

const LOCALE_KEY = 'stokpot.locale';
const DEFAULT_LOCALE: Locale = 'en';

function interpolate(template: string, vars?: Record<string, string | number>): string {
	if (!vars) return template;
	return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

class LocaleState {
	current = $state<Locale>(DEFAULT_LOCALE);

	async restore() {
		const { value } = await Preferences.get({ key: LOCALE_KEY });
		if (value === 'en' || value === 'fr') this.current = value;
	}

	async set(locale: Locale) {
		this.current = locale;
		await Preferences.set({ key: LOCALE_KEY, value: locale });
	}
}

export const locale = new LocaleState();

// Falls back to English on a missing key rather than the raw key itself — a translation gap
// should degrade to readable English, not a visible `some.dotted.key` string.
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
	const template = translations[locale.current][key] ?? translations[DEFAULT_LOCALE][key] ?? key;
	return interpolate(template, vars);
}

// Category/unit/difficulty display labels are keyed by the exact English value stored in the
// DB/API — this looks one up with a plain-string fallback for any value without a translation
// entry (e.g. future categories), rather than requiring every caller to guard the lookup.
export function tRaw(prefix: 'category' | 'unit' | 'difficulty', value: string): string {
	const key = `${prefix}.${value}` as TranslationKey;
	const dict = translations[locale.current] as Record<string, string>;
	const fallback = translations[DEFAULT_LOCALE] as Record<string, string>;
	return dict[key] ?? fallback[key] ?? value;
}
