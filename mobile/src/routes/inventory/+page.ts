import { listInventory, getRestockPredictions } from '$lib/api/inventory';
import type { InventoryCategory } from '$lib/types/inventory';

export const load = async ({ url, depends }) => {
	depends('app:inventory');
	const category = (url.searchParams.get('category') as InventoryCategory | null) ?? undefined;
	const [items, restock] = await Promise.all([listInventory({ category }), getRestockPredictions(7).catch(() => [])]);
	return {
		items,
		// itemId → days left, for the badge.
		runsOut: Object.fromEntries(restock.map((p) => [p.itemId, p.daysLeft])) as Record<string, number>,
		category: category ?? null,
		// Client-side filter using the expiry-days setting.
		expiringOnly: url.searchParams.get('expiring') === '1'
	};
};
