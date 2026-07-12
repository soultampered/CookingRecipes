import { getRecipe } from '$lib/api/recipes';
import { getInventoryItem } from '$lib/api/inventory';

export const load = async ({ params, depends }) => {
	depends(`app:recipe:${params.id}`);
	const recipe = await getRecipe(params.id);

	// Recipes are global and can reference another user's inventory items, so names are
	// resolved per-id here rather than filtered against the current user's own inventory list.
	const uniqueIds = [...new Set(recipe.ingredients.map((i) => i.inventoryItemId))];
	const results = await Promise.allSettled(uniqueIds.map((id) => getInventoryItem(id)));
	const inventoryNames: Record<string, string> = {};
	results.forEach((result, index) => {
		if (result.status === 'fulfilled') {
			inventoryNames[uniqueIds[index]] = result.value.name;
		}
	});

	return { recipe, inventoryNames };
};
