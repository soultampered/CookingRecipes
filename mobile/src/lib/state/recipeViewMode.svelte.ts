import { Preferences } from '@capacitor/preferences';

export type RecipeViewMode = 'list' | 'grid';

const VIEW_MODE_KEY = 'stokpot.recipeViewMode';

class RecipeViewModeState {
	current = $state<RecipeViewMode>('list');

	async restore() {
		const { value } = await Preferences.get({ key: VIEW_MODE_KEY });
		if (value === 'list' || value === 'grid') this.current = value;
	}

	async set(mode: RecipeViewMode) {
		this.current = mode;
		await Preferences.set({ key: VIEW_MODE_KEY, value: mode });
	}
}

export const recipeViewMode = new RecipeViewModeState();
