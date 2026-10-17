import { getMealPlan } from '$lib/api/mealPlan';
import { listRecipes } from '$lib/api/recipes';
import { addDays, fromLocalISODate, startOfWeek, toLocalISODate } from '$lib/utils/dates';

export const load = async ({ url, depends }) => {
	depends('app:meal-plan');
	const weekParam = url.searchParams.get('week');
	const start = startOfWeek(weekParam ? fromLocalISODate(weekParam) : new Date());
	const from = toLocalISODate(start);
	const to = toLocalISODate(addDays(start, 6));
	const [entries, recipes] = await Promise.all([getMealPlan(from, to), listRecipes()]);
	return { from, to, entries, recipes };
};
