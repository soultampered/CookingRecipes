import { listInventory } from '$lib/api/inventory';

export const load = async () => {
	// Ingredients can come from any of your pantries.
	return { inventoryItems: await listInventory({ household: 'all' }) };
};
