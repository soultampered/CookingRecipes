import { listRecipes, getSuggestions } from '$lib/api/recipes';
import { listInventory } from '$lib/api/inventory';
import { listShoppingLists } from '$lib/api/shoppingLists';
import { getNutritionSummary } from '$lib/api/nutrition';

export const load = async ({ depends }) => {
	depends('app:dashboard');
	const [recipes, suggestions, inventory, shoppingLists, nutrition] = await Promise.all([
		listRecipes(),
		getSuggestions(),
		listInventory(),
		listShoppingLists(),
		// Optional card — never block the dashboard on it.
		getNutritionSummary(1).catch(() => null)
	]);
	return { recipes, suggestions, inventory, shoppingLists, nutritionToday: nutrition?.[0] ?? null };
};
