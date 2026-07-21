import { Preferences } from '@capacitor/preferences';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'stokpot.theme';

function systemTheme(): Theme {
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

class ThemeState {
	current = $state<Theme>('light');

	async restore() {
		const { value } = await Preferences.get({ key: THEME_KEY });
		if (value === 'light' || value === 'dark') {
			this.current = value;
			document.documentElement.setAttribute('data-theme', value);
		} else {
			// No explicit choice yet — follow the OS via the CSS media query, and just
			// reflect its current resolution in the toggle's displayed position.
			this.current = systemTheme();
		}
	}

	async toggle() {
		this.current = this.current === 'dark' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', this.current);
		await Preferences.set({ key: THEME_KEY, value: this.current });
	}
}

export const theme = new ThemeState();
