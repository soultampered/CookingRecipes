import { Preferences } from '@capacitor/preferences';
import { listHouseholds, type Household } from '$lib/api/households';

const PANTRY_KEY = 'stokpot.activePantry';

// STO-88: which pantry Inventory / Shopping Lists / Dashboard show. null = "My kitchen".
class ActivePantryState {
	current = $state<string | null>(null);
	households = $state<Household[]>([]);

	async restore() {
		const { value } = await Preferences.get({ key: PANTRY_KEY });
		this.current = value || null;
	}

	async set(householdId: string | null) {
		this.current = householdId;
		await Preferences.set({ key: PANTRY_KEY, value: householdId ?? '' });
	}

	// Drops a remembered pantry the user no longer belongs to.
	async refresh() {
		try {
			this.households = await listHouseholds();
			if (this.current && !this.households.some((h) => h._id === this.current)) await this.set(null);
		} catch {
			// offline etc. — keep what we have
		}
	}

	name(householdId: string | null | undefined): string | null {
		return householdId ? (this.households.find((h) => h._id === householdId)?.name ?? null) : null;
	}
}

export const activePantry = new ActivePantryState();
// Loaders await this so a cold start lands in the right pantry.
export const pantryRestored = activePantry.restore();
