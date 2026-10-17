import { apiFetch } from './client';

// STO-79
export interface RecipeCollection {
	_id: string;
	name: string;
	recipeIds: string[];
}

export function listCollections() {
	return apiFetch<RecipeCollection[]>('/collections');
}

export function createCollection(name: string) {
	return apiFetch<RecipeCollection>('/collections', { method: 'POST', body: JSON.stringify({ name }) });
}

export function renameCollection(id: string, name: string) {
	return apiFetch<RecipeCollection>(`/collections/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}

export function deleteCollection(id: string) {
	return apiFetch<void>(`/collections/${id}`, { method: 'DELETE' });
}

export function addToCollection(id: string, recipeId: string) {
	return apiFetch<RecipeCollection>(`/collections/${id}/recipes`, {
		method: 'POST',
		body: JSON.stringify({ recipeId })
	});
}

export function removeFromCollection(id: string, recipeId: string) {
	return apiFetch<RecipeCollection>(`/collections/${id}/recipes/${recipeId}`, { method: 'DELETE' });
}
