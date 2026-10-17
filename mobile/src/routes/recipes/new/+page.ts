import { listInventory } from '$lib/api/inventory';

export const load = async () => {
	// Ingredients can come from any pantry you belong to (STO-88).
	return { inventoryItems: await listInventory({ household: 'all' }) };
};
