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

export function updateRecipe(id: string, patch: Partial<Recipe> & { editNote?: string }) {
	return apiFetch<Recipe>(`/recipes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteRecipe(id: string) {
	return apiFetch<void>(`/recipes/${id}`, { method: 'DELETE' });
}

export interface InventoryAdjustment {
	id: string;
	amount: number;
}

// overrides = amount used per item (wins over scale).
export interface PrepareOptions {
	scale?: number;
	overrides?: { inventoryItemId: string; index?: number; quantity: number }[];
	leftovers?: { servings: number; expiresInDays: number };
}

export interface PrepareResult {
	success: true;
	adjustments: InventoryAdjustment[];
	updatedInventory: Inventory[];
	// nutrition log row, removed on undo
	preparationId?: string;
	leftover?: Inventory;
	leftoverFailed?: boolean;
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

export interface RecipeRevision {
	_id: string;
	recipeId: string;
	before: Pick<Recipe, 'title' | 'description' | 'ingredients' | 'instructions' | 'servings' | 'tags'>;
	changed: string[];
	note?: string;
	editedAt: string;
}

export function listRevisions(id: string) {
	return apiFetch<RecipeRevision[]>(`/recipes/${id}/revisions`);
}

export function restoreRevision(id: string, revisionId: string) {
	return apiFetch<Recipe>(`/recipes/${id}/revisions/${revisionId}/restore`, { method: 'POST' });
}

export function enableShare(id: string) {
	return apiFetch<{ token: string; url: string }>(`/recipes/${id}/share`, { method: 'POST' });
}

export function disableShare(id: string) {
	return apiFetch<void>(`/recipes/${id}/share`, { method: 'DELETE' });
}

export function importRecipe(url: string) {
	return apiFetch<{ recipe: Recipe; createdInventoryNames: string[]; sourceUrl: string }>('/recipes/import', {
		method: 'POST',
		body: JSON.stringify({ url })
	});
}
