import { listRecipes, getSuggestions } from '$lib/api/recipes';
import { listInventory } from '$lib/api/inventory';
import { listShoppingLists } from '$lib/api/shoppingLists';

export const load = async ({ depends }) => {
	depends('app:dashboard');
	const [recipes, suggestions, inventory, shoppingLists] = await Promise.all([
		listRecipes(),
		getSuggestions(),
		listInventory(),
		listShoppingLists()
	]);
	return { recipes, suggestions, inventory, shoppingLists };
};
