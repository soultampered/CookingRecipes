import { getNutritionSummary } from '$lib/api/nutrition';

export const load = async ({ depends }) => {
	depends('app:nutrition');
	return { days: await getNutritionSummary(7) };
};
