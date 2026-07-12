import { getRecipe } from '$lib/api/recipes';
import { listInventory } from '$lib/api/inventory';

export const load = async ({ params, depends }) => {
	depends(`app:recipe:${params.id}`);
	const [recipe, inventoryItems] = await Promise.all([getRecipe(params.id), listInventory()]);
	return { recipe, inventoryItems };
};
