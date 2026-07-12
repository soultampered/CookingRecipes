import { listRecipes, getSuggestions } from '$lib/api/recipes';
import { listInventory } from '$lib/api/inventory';

export const load = async ({ depends }) => {
	depends('app:dashboard');
	const [recipes, suggestions, inventory] = await Promise.all([
		listRecipes(),
		getSuggestions(),
		listInventory()
	]);
	return { recipes, suggestions, inventory };
};
