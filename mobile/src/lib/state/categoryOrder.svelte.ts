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

	async move(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= this.current.length) return;
		const copy = [...this.current];
		[copy[index], copy[target]] = [copy[target], copy[index]];
		this.current = copy;
		await Preferences.set({ key: CATEGORY_ORDER_KEY, value: JSON.stringify(copy) });
	}
}

export const categoryOrder = new CategoryOrderState();
