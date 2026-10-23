import { getRecipe, listRecipes } from '$lib/api/recipes';
import { getInventoryItem } from '$lib/api/inventory';
import type { Inventory } from '$lib/types/inventory';

export const load = async ({ params, depends }) => {
	depends(`app:recipe:${params.id}`);
	depends('app:recipes');
	const [recipe, allRecipes] = await Promise.all([getRecipe(params.id), listRecipes()]);

	// Recipes are global and can reference another user's inventory items, so names are
	// resolved per-id here rather than filtered against the current user's own inventory list.
	const uniqueIds = [...new Set(recipe.ingredients.map((i) => i.inventoryItemId))];
	const results = await Promise.allSettled(uniqueIds.map((id) => getInventoryItem(id)));
	const inventoryNames: Record<string, string> = {};
	// Full items too, for stock checks.
	const inventory: Record<string, Inventory> = {};
	results.forEach((result, index) => {
		if (result.status === 'fulfilled') {
			inventoryNames[uniqueIds[index]] = result.value.name;
			inventory[uniqueIds[index]] = result.value;
		}
	});

	return { recipe, inventoryNames, inventory, allRecipes };
};
