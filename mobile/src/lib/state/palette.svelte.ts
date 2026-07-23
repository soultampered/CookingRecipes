import { Preferences } from '@capacitor/preferences';
import { PALETTES, SEMANTIC, DEFAULT_PALETTE, type Mode } from '$lib/theme/palettes';
import { mix, lighten } from '$lib/theme/colorMath';

const PALETTE_KEY = 'stokpot.palette';

class PaletteState {
	current = $state<string>(DEFAULT_PALETTE);

	async restore(mode: Mode) {
		const { value } = await Preferences.get({ key: PALETTE_KEY });
		if (value && PALETTES.some((p) => p.name === value)) {
			this.current = value;
		}
		this.applyForMode(mode);
	}

	async set(name: string, mode: Mode) {
		this.current = name;
		await Preferences.set({ key: PALETTE_KEY, value: name });
		this.applyForMode(mode);
	}

	applyForMode(mode: Mode) {
		const palette = PALETTES.find((p) => p.name === this.current) ?? PALETTES[0];
		const colors = palette[mode];
		const sem = SEMANTIC[mode];
		const root = document.documentElement.style;

		root.setProperty('--ink', colors.ink);
		root.setProperty('--ink-soft', mix(colors.ink, colors.paper, 0.25));
		root.setProperty('--paper', colors.paper);
		root.setProperty('--paper-raised', mode === 'light' ? '#FFFFFF' : lighten(colors.paper, 14));
		root.setProperty('--line', colors.line);
		root.setProperty('--accent', colors.accent);
		root.setProperty('--accent-soft', mix(colors.accent, colors.paper, 0.88));
		root.setProperty('--good', sem.good);
		root.setProperty('--good-soft', sem.goodSoft);
		root.setProperty('--warn', sem.warn);
		root.setProperty('--warn-soft', sem.warnSoft);
		root.setProperty('--bad', sem.bad);
		root.setProperty('--bad-soft', sem.badSoft);
	}
}

export const palette = new PaletteState();
