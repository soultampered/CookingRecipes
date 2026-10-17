import { apiFetch } from './client';

export interface NutritionDay {
	date: string;
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
	preparations: { recipeTitle: string; servings: number }[];
}

export function getNutritionSummary(days = 7) {
	const tz = new Date().getTimezoneOffset();
	return apiFetch<NutritionDay[]>(`/nutrition/summary?days=${days}&tz=${tz}`);
}
