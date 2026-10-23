import { apiFetch } from './client';
import type { NewShoppingList, ShoppingList, ShoppingListItem } from '$lib/types/shoppingList';

export function listShoppingLists() {
	return apiFetch<ShoppingList[]>('/shopping-lists');
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

// Whole-array writes get 409 LIST_CHANGED if the list changed since it was loaded.
export function updateListItems(list: ShoppingList, items: ShoppingListItem[]) {
	return apiFetch<ShoppingList>(`/shopping-lists/${list._id}`, {
		method: 'PATCH',
		body: JSON.stringify({ items, ifUpdatedAt: list.updatedAt })
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
