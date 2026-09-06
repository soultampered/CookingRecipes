import { Preferences } from '@capacitor/preferences';

// STO-113: user-facing text-size control (Account screen). The type-scale tokens in
// app.css are rem-based, so rescaling is just a matter of changing the root font-size —
// every `--text-*` token, and everything referencing them, scales together.
export type TextScale = 'small' | 'normal' | 'large';

const TEXT_SCALE_KEY = 'stokpot.textScale';

// Matches the `html { font-size: 16px }` baseline in app.css.
const ROOT_PX: Record<TextScale, string> = {
	small: '15px',
	normal: '16px',
	large: '18px'
};

class TextScaleState {
	current = $state<TextScale>('normal');

	#apply(scale: TextScale) {
		document.documentElement.style.fontSize = ROOT_PX[scale];
	}

	async restore() {
		const { value } = await Preferences.get({ key: TEXT_SCALE_KEY });
		if (value === 'small' || value === 'normal' || value === 'large') {
			this.current = value;
		}
		this.#apply(this.current);
	}

	async set(scale: TextScale) {
		this.current = scale;
		this.#apply(scale);
		await Preferences.set({ key: TEXT_SCALE_KEY, value: scale });
	}
}

export const textScale = new TextScaleState();
