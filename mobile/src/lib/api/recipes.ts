import { apiFetch } from './client';
import type { MissingIngredient, NewRecipe, Recipe } from '$lib/types/recipe';
import type { Inventory } from '$lib/types/inventory';

export function listRecipes() {
	return apiFetch<Recipe[]>('/recipes');
}

export function getRecipe(id: string) {
	return apiFetch<Recipe>(`/recipes/${id}`);
}

export function createRecipe(data: NewRecipe) {
	return apiFetch<Recipe>('/recipes', { method: 'POST', body: JSON.stringify(data) });
}

export function updateRecipe(id: string, patch: Partial<Recipe>) {
	return apiFetch<Recipe>(`/recipes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteRecipe(id: string) {
	return apiFetch<void>(`/recipes/${id}`, { method: 'DELETE' });
}

export interface InventoryAdjustment {
	id: string;
	amount: number;
}

// STO-20/117: overrides = amount actually used per item (wins over scale).
export interface PrepareOptions {
	scale?: number;
	overrides?: { inventoryItemId: string; quantity: number }[];
}

export interface PrepareResult {
	success: true;
	adjustments: InventoryAdjustment[];
	updatedInventory: Inventory[];
}

export function prepareRecipe(id: string, options: PrepareOptions = {}) {
	return apiFetch<PrepareResult>(`/recipes/${id}/prepare`, {
		method: 'POST',
		body: JSON.stringify(options)
	});
}

export function getMissingIngredients(id: string) {
	return apiFetch<MissingIngredient[]>(`/recipes/${id}/missing-ingredients`);
}

export function getSuggestions() {
	return apiFetch<Recipe[]>('/recipes/suggestions');
}
