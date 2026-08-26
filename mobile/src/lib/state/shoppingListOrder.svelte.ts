import { Preferences } from '@capacitor/preferences';

const SHOPPING_LIST_ORDER_KEY = 'stokpot.shoppingListOrder';

// Unlike categoryOrder.svelte.ts (STO-26), the set of ids here isn't a fixed compile-time
// enum — shopping lists are created/deleted at runtime, so the saved order has to be
// reconciled against whatever the caller actually has on each render: dropped ids
// (deleted lists) are silently ignored, and unknown ids (new lists, or before the first
// reorder ever happens) are appended in their incoming order rather than disappearing.
class ShoppingListOrderState {
	current = $state<string[]>([]);

	async restore() {
		const { value } = await Preferences.get({ key: SHOPPING_LIST_ORDER_KEY });
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

	apply<T extends { _id?: string }>(lists: T[]): T[] {
		const byId = new Map(lists.map((l) => [l._id!, l]));
		const ordered = this.current.map((id) => byId.get(id)).filter((l): l is T => !!l);
		const known = new Set(this.current);
		for (const list of lists) {
			if (!known.has(list._id!)) ordered.push(list);
		}
		return ordered;
	}

	// STO-108: drag-to-reorder replaced the up/down buttons that used to call an adjacent-swap
	// move(orderedIds, index, direction) — this handles an arbitrary-distance move in one step.
	async reorder(orderedIds: string[], fromIndex: number, toIndex: number) {
		const copy = [...orderedIds];
		const [moved] = copy.splice(fromIndex, 1);
		copy.splice(toIndex, 0, moved);
		this.current = copy;
		await Preferences.set({ key: SHOPPING_LIST_ORDER_KEY, value: JSON.stringify(copy) });
	}
}

export const shoppingListOrder = new ShoppingListOrderState();
