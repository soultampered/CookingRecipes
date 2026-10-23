import { Preferences } from '@capacitor/preferences';
import { INVENTORY_CATEGORIES, type InventoryCategory } from '$lib/types/inventory';

const CATEGORY_ORDER_KEY = 'stokpot.categoryOrder';

// Keep a saved order across category changes: unknowns drop, new ones go before Miscellaneous.
function mergeOrder(value: unknown): InventoryCategory[] | null {
	if (!Array.isArray(value)) return null;
	const known = new Set<string>(INVENTORY_CATEGORIES);
	const kept = [...new Set(value)].filter((c): c is InventoryCategory => known.has(c));
	if (kept.length === 0) return null;
	const missing = INVENTORY_CATEGORIES.filter((c) => !kept.includes(c));
	const miscAt = kept.indexOf('Miscellaneous');
	if (miscAt >= 0) kept.splice(miscAt, 0, ...missing.filter((c) => c !== 'Miscellaneous'));
	else kept.push(...missing);
	return kept;
}

class CategoryOrderState {
	current = $state<InventoryCategory[]>([...INVENTORY_CATEGORIES]);

	async restore() {
		const { value } = await Preferences.get({ key: CATEGORY_ORDER_KEY });
		if (!value) return;
		try {
			const merged = mergeOrder(JSON.parse(value));
			if (merged) this.current = merged;
		} catch {
			// Corrupt value — ignore and keep the default order.
		}
	}

	// STO-108: drag-to-reorder replaced the up/down buttons that used to call an adjacent-swap
	// move(index, direction) — this handles an arbitrary-distance move in one step.
	async reorder(fromIndex: number, toIndex: number) {
		const copy = [...this.current];
		const [moved] = copy.splice(fromIndex, 1);
		copy.splice(toIndex, 0, moved);
		this.current = copy;
		await Preferences.set({ key: CATEGORY_ORDER_KEY, value: JSON.stringify(copy) });
	}
}

export const categoryOrder = new CategoryOrderState();
