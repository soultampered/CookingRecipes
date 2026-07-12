import { apiFetch } from './client';
import type { User } from '$lib/types/user';

export function getUser(id: string) {
	return apiFetch<User>(`/users/${id}`);
}

export function updateUser(id: string, patch: Partial<User>) {
	return apiFetch<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteUser(id: string) {
	return apiFetch<void>(`/users/${id}`, { method: 'DELETE' });
}
