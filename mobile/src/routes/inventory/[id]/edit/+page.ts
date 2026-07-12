import { getInventoryItem } from '$lib/api/inventory';

export const load = async ({ params }) => {
	return { item: await getInventoryItem(params.id) };
};
