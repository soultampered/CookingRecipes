import { Preferences } from '@capacitor/preferences';
import type { UnitSystem } from '$lib/utils/unitConversion';

const UNIT_SYSTEM_KEY = 'stokpot.unitSystem';

// Per-device display preference; stored quantities never change.
class UnitSystemState {
	current = $state<UnitSystem>('original');

	async restore() {
		const { value } = await Preferences.get({ key: UNIT_SYSTEM_KEY });
		if (value === 'original' || value === 'metric' || value === 'imperial') this.current = value;
	}

	async set(system: UnitSystem) {
		this.current = system;
		await Preferences.set({ key: UNIT_SYSTEM_KEY, value: system });
	}
}

export const unitSystem = new UnitSystemState();
