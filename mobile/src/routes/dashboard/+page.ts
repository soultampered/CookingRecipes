import { listRecipes, getSuggestions } from '$lib/api/recipes';
import { listInventory, getRestockPredictions } from '$lib/api/inventory';
import { listShoppingLists } from '$lib/api/shoppingLists';
import { getNutritionSummary } from '$lib/api/nutrition';
import { getMealPlan } from '$lib/api/mealPlan';
import { addDays, startOfWeek, toLocalISODate } from '$lib/utils/dates';
import { activePantry, pantryRestored } from '$lib/state/activePantry.svelte';

export const load = async ({ depends }) => {
	depends('app:dashboard');
	depends('app:pantry');
	await pantryRestored;
	const week = startOfWeek(new Date());
	const [recipes, suggestions, inventory, shoppingLists, nutrition, restock, mealPlan] = await activePantry.load((household) =>
		Promise.all([
			listRecipes(),
			getSuggestions(),
			listInventory({ household }),
			listShoppingLists(household),
			// Optional card — never block the dashboard on it.
			getNutritionSummary(1).catch(() => null),
			getRestockPredictions(7, household).catch(() => []),
			getMealPlan(toLocalISODate(week), toLocalISODate(addDays(week, 6))).catch(() => [])
		])
	);
	return { recipes, suggestions, inventory, shoppingLists, nutritionToday: nutrition?.[0] ?? null, restock, mealPlan };
};
