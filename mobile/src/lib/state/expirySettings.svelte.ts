import { Preferences } from '@capacitor/preferences';

const EXPIRING_SOON_DAYS_KEY = 'stokpot.expiringSoonDays';
const DEFAULT_DAYS = 3;

class ExpirySettingsState {
	daysAhead = $state(DEFAULT_DAYS);

	async restore() {
		const { value } = await Preferences.get({ key: EXPIRING_SOON_DAYS_KEY });
		const parsed = value ? Number(value) : NaN;
		if (Number.isFinite(parsed) && parsed >= 0) this.daysAhead = parsed;
	}

	async set(days: number) {
		this.daysAhead = days;
		await Preferences.set({ key: EXPIRING_SOON_DAYS_KEY, value: String(days) });
	}
}

export const expirySettings = new ExpirySettingsState();
