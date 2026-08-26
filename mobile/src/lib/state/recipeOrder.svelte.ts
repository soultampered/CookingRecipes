import { Preferences } from '@capacitor/preferences';

const RECIPE_ORDER_KEY = 'stokpot.recipeOrder';

// Same shape as shoppingListOrder.svelte.ts (STO-106) / inventoryOrder.svelte.ts.
class RecipeOrderState {
	current = $state<string[]>([]);

	async restore() {
		const { value } = await Preferences.get({ key: RECIPE_ORDER_KEY });
		if (!value) return;
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
				this.current = parsed;
			}
		} catch {
			// Corrupt value — ignore and keep the default (empty, i.e. incoming order).
		}
	}

	apply<T extends { _id?: string }>(recipes: T[]): T[] {
		const byId = new Map(recipes.map((r) => [r._id!, r]));
		const ordered = this.current.map((id) => byId.get(id)).filter((r): r is T => !!r);
		const known = new Set(this.current);
		for (const recipe of recipes) {
			if (!known.has(recipe._id!)) ordered.push(recipe);
		}
		return ordered;
	}

	async reorder(orderedIds: string[], fromIndex: number, toIndex: number) {
		const copy = [...orderedIds];
		const [moved] = copy.splice(fromIndex, 1);
		copy.splice(toIndex, 0, moved);
		this.current = copy;
		await Preferences.set({ key: RECIPE_ORDER_KEY, value: JSON.stringify(copy) });
	}
}

export const recipeOrder = new RecipeOrderState();
