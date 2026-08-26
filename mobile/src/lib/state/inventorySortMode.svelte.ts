import { Preferences } from '@capacitor/preferences';

export type InventorySortMode = 'custom' | 'name' | 'expiration' | 'quantity';

const SORT_MODE_KEY = 'stokpot.inventorySortMode';
const VALID_MODES: InventorySortMode[] = ['custom', 'name', 'expiration', 'quantity'];

class InventorySortModeState {
	current = $state<InventorySortMode>('custom');

	async restore() {
		const { value } = await Preferences.get({ key: SORT_MODE_KEY });
		if (value && (VALID_MODES as string[]).includes(value)) {
			this.current = value as InventorySortMode;
		}
	}

	async set(mode: InventorySortMode) {
		this.current = mode;
		await Preferences.set({ key: SORT_MODE_KEY, value: mode });
	}
}

export const inventorySortMode = new InventorySortModeState();
