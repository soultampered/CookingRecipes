import { apiFetch } from './client';
import type { NewUser, User } from '$lib/types/user';

export function getUser(id: string) {
	return apiFetch<User>(`/users/${id}`);
}

// The response includes the plaintext password field (backend does not hash or strip it) —
// callers must never display or log the returned value.
export function createUser(data: NewUser) {
	return apiFetch<User>('/users', { method: 'POST', body: JSON.stringify(data) });
}

export function updateUser(id: string, patch: Partial<User>) {
	return apiFetch<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteUser(id: string) {
	return apiFetch<void>(`/users/${id}`, { method: 'DELETE' });
}
