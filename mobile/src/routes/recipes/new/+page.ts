import { listInventory } from '$lib/api/inventory';

export const load = async () => {
	return { inventoryItems: await listInventory() };
};
