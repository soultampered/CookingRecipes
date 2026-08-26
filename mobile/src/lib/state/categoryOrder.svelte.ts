import { Preferences } from '@capacitor/preferences';
import { INVENTORY_CATEGORIES, type InventoryCategory } from '$lib/types/inventory';

const CATEGORY_ORDER_KEY = 'stokpot.categoryOrder';

function isValidOrder(value: unknown): value is InventoryCategory[] {
	if (!Array.isArray(value)) return false;
	const asSet = new Set(value);
	return (
		asSet.size === INVENTORY_CATEGORIES.length &&
		INVENTORY_CATEGORIES.every((c) => asSet.has(c))
	);
}

class CategoryOrderState {
	current = $state<InventoryCategory[]>([...INVENTORY_CATEGORIES]);

	async restore() {
		const { value } = await Preferences.get({ key: CATEGORY_ORDER_KEY });
		if (!value) return;
		try {
			const parsed = JSON.parse(value);
			// Guards against a stale saved order from before a category was added/removed —
			// falls back to the default rather than silently dropping/misplacing a category.
			if (isValidOrder(parsed)) this.current = parsed;
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
