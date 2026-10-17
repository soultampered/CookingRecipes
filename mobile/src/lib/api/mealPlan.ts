import { apiFetch } from './client';

// STO-9
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface MealPlanEntry {
	_id: string;
	date: string;
	recipeId: string;
	recipeTitle: string;
	slot?: MealSlot;
	servings?: number;
}

export function getMealPlan(from: string, to: string) {
	return apiFetch<MealPlanEntry[]>(`/meal-plan?from=${from}&to=${to}`);
}

export function addToMealPlan(data: { date: string; recipeId: string; slot?: MealSlot; servings?: number }) {
	return apiFetch<MealPlanEntry>('/meal-plan', { method: 'POST', body: JSON.stringify(data) });
}

export function removeFromMealPlan(id: string) {
	return apiFetch<void>(`/meal-plan/${id}`, { method: 'DELETE' });
}

// STO-87: server-side equivalent of the sheet (no per-recipe tweaks).
export function shoppingListFromPlan(from: string, to: string, name?: string) {
	return apiFetch<{ _id: string }>('/meal-plan/shopping-list', {
		method: 'POST',
		body: JSON.stringify({ from, to, name })
	});
}
