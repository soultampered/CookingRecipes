import { Preferences } from '@capacitor/preferences';
import { listHouseholds, type Household } from '$lib/api/households';
import { ApiError } from '$lib/api/client';

const PANTRY_KEY = 'stokpot.activePantry';

// Pantry shown by Inventory / Lists / Dashboard; null = My kitchen.
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

	async clear() {
		this.households = [];
		await this.set(null);
	}

	// Pantry-scoped load; a 403 (pantry gone) falls back to My kitchen.
	async load<T>(fn: (household: string | null) => Promise<T>): Promise<T> {
		const household = this.current;
		try {
			return await fn(household);
		} catch (err) {
			if (!household || !(err instanceof ApiError) || err.status !== 403) throw err;
			await this.set(null);
			return fn(null);
		}
	}

	name(householdId: string | null | undefined): string | null {
		return householdId ? (this.households.find((h) => h._id === householdId)?.name ?? null) : null;
	}
}

export const activePantry = new ActivePantryState();
// Loaders await this so a cold start lands in the right pantry.
export const pantryRestored = activePantry.restore();
