import { apiFetch } from './client';
import type { NewShoppingList, ShoppingList, ShoppingListItem } from '$lib/types/shoppingList';

export function listShoppingLists(household?: string | null) {
	return apiFetch<ShoppingList[]>(`/shopping-lists${household ? `?household=${household}` : ''}`);
}

export function getShoppingList(id: string) {
	return apiFetch<ShoppingList>(`/shopping-lists/${id}`);
}

export function createShoppingList(data: NewShoppingList) {
	return apiFetch<ShoppingList>('/shopping-lists', { method: 'POST', body: JSON.stringify(data) });
}

export function updateShoppingList(id: string, patch: Partial<ShoppingList>) {
	return apiFetch<ShoppingList>(`/shopping-lists/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(patch)
	});
}

export function deleteShoppingList(id: string) {
	return apiFetch<void>(`/shopping-lists/${id}`, { method: 'DELETE' });
}

export function addItem(listId: string, item: Omit<ShoppingListItem, '_id'>) {
	return apiFetch<ShoppingList>(`/shopping-lists/${listId}/items`, {
		method: 'POST',
		body: JSON.stringify(item)
	});
}

export function removeItem(listId: string, itemId: string) {
	return apiFetch<ShoppingList>(`/shopping-lists/${listId}/items/${itemId}`, { method: 'DELETE' });
}

export function toggleItemChecked(listId: string, itemId: string) {
	return apiFetch<ShoppingList>(`/shopping-lists/${listId}/items/${itemId}`, { method: 'PATCH' });
}

// STO-80/87
export interface PlannedItem {
	inventoryItemId: string;
	name: string;
	unit: string;
	needed: number;
	have: number;
	toBuy: number;
	recipes: string[];
	unitMismatch: boolean;
}

export type RecipeRequest = { recipeId: string; scale?: number };

export function previewFromRecipes(recipes: RecipeRequest[], householdId?: string | null) {
	return apiFetch<PlannedItem[]>('/shopping-lists/from-recipes/preview', {
		method: 'POST',
		body: JSON.stringify({ recipes, householdId })
	});
}

export function createFromRecipes(
	recipes: RecipeRequest[],
	options: { name?: string; listId?: string; householdId?: string | null } = {}
) {
	return apiFetch<ShoppingList>('/shopping-lists/from-recipes', {
		method: 'POST',
		body: JSON.stringify({ recipes, ...options })
	});
}
