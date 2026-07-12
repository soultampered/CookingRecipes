import { apiFetch } from './client';
import type { Inventory, InventoryCategory, NewInventory } from '$lib/types/inventory';

export function listInventory(filter: { category?: InventoryCategory } = {}) {
	const params = new URLSearchParams();
	if (filter.category) params.set('category', filter.category);
	const query = params.toString();
	return apiFetch<Inventory[]>(`/inventory${query ? `?${query}` : ''}`);
}

export function getInventoryItem(id: string) {
	return apiFetch<Inventory>(`/inventory/${id}`);
}

export function createInventoryItem(data: NewInventory) {
	return apiFetch<Inventory>('/inventory', { method: 'POST', body: JSON.stringify(data) });
}

// Note: this endpoint uses PUT, unlike recipes/users which use PATCH.
export function updateInventoryItem(id: string, patch: Partial<Inventory>) {
	return apiFetch<Inventory>(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

// Note: this endpoint returns 200 {success:true}, unlike recipes/users which return 204.
export function deleteInventoryItem(id: string) {
	return apiFetch<{ success: true }>(`/inventory/${id}`, { method: 'DELETE' });
}
