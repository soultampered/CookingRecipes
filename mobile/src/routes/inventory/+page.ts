import { listInventory } from '$lib/api/inventory';
import type { InventoryCategory } from '$lib/types/inventory';

export const load = async ({ url, depends }) => {
	depends('app:inventory');
	const category = (url.searchParams.get('category') as InventoryCategory | null) ?? undefined;
	return {
		items: await listInventory({ category }),
		category: category ?? null
	};
};
