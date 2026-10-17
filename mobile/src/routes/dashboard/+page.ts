import { listRecipes, getSuggestions } from '$lib/api/recipes';
import { listInventory, getRestockPredictions } from '$lib/api/inventory';
import { listShoppingLists } from '$lib/api/shoppingLists';
import { getNutritionSummary } from '$lib/api/nutrition';
import { getMealPlan } from '$lib/api/mealPlan';
import { addDays, startOfWeek, toLocalISODate } from '$lib/utils/dates';

export const load = async ({ depends }) => {
	depends('app:dashboard');
	const week = startOfWeek(new Date());
	const [recipes, suggestions, inventory, shoppingLists, nutrition, restock, mealPlan] = await Promise.all([
		listRecipes(),
		getSuggestions(),
		listInventory(),
		listShoppingLists(),
		// Optional card — never block the dashboard on it.
		getNutritionSummary(1).catch(() => null),
		getRestockPredictions(7).catch(() => []),
		getMealPlan(toLocalISODate(week), toLocalISODate(addDays(week, 6))).catch(() => [])
	]);
	return { recipes, suggestions, inventory, shoppingLists, nutritionToday: nutrition?.[0] ?? null, restock, mealPlan };
};
