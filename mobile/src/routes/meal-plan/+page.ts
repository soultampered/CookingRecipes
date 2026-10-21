import { getMealPlan } from '$lib/api/mealPlan';
import { listRecipes } from '$lib/api/recipes';
import { addDays, fromLocalISODate, startOfWeek, toLocalISODate } from '$lib/utils/dates';

export const load = async ({ url, depends }) => {
	depends('app:meal-plan');
	// A malformed ?week= falls back to this week.
	const weekParam = url.searchParams.get('week');
	const picked = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? fromLocalISODate(weekParam) : null;
	const start = startOfWeek(picked && !Number.isNaN(picked.getTime()) ? picked : new Date());
	const from = toLocalISODate(start);
	const to = toLocalISODate(addDays(start, 6));
	const [entries, recipes] = await Promise.all([getMealPlan(from, to), listRecipes()]);
	return { from, to, entries, recipes };
};
