import { Preferences } from '@capacitor/preferences';

const INVENTORY_ORDER_KEY = 'stokpot.inventoryOrder';

// Same shape as shoppingListOrder.svelte.ts (STO-106) — a runtime-dynamic id set (items are
// created/deleted freely), so the saved order is reconciled against whatever's actually being
// displayed rather than assumed complete. One global order key works fine even though the
// inventory screen filters by category: apply() only ever orders whatever's in the current
// (possibly filtered) `items` array, so ids from other categories simply don't participate.
class InventoryOrderState {
	current = $state<string[]>([]);

	async restore() {
		const { value } = await Preferences.get({ key: INVENTORY_ORDER_KEY });
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

	apply<T extends { _id?: string }>(items: T[]): T[] {
		const byId = new Map(items.map((i) => [i._id!, i]));
		const ordered = this.current.map((id) => byId.get(id)).filter((i): i is T => !!i);
		const known = new Set(this.current);
		for (const item of items) {
			if (!known.has(item._id!)) ordered.push(item);
		}
		return ordered;
	}

	async reorder(orderedIds: string[], fromIndex: number, toIndex: number) {
		const copy = [...orderedIds];
		const [moved] = copy.splice(fromIndex, 1);
		copy.splice(toIndex, 0, moved);
		this.current = copy;
		await Preferences.set({ key: INVENTORY_ORDER_KEY, value: JSON.stringify(copy) });
	}
}

export const inventoryOrder = new InventoryOrderState();
