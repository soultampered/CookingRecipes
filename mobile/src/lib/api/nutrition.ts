import { apiFetch } from './client';

export interface NutritionDay {
	date: string;
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
	preparations: { recipeTitle: string; servings: number }[];
}

export function deletePreparation(id: string) {
	return apiFetch<void>(`/nutrition/preparations/${id}`, { method: 'DELETE' });
}

export function getNutritionSummary(days = 7) {
	const tz = new Date().getTimezoneOffset();
	return apiFetch<NutritionDay[]>(`/nutrition/summary?days=${days}&tz=${tz}`);
}
