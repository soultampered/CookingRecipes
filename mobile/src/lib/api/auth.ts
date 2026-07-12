import { apiFetch } from './client';
import type { User } from '$lib/types/user';

export interface AuthResponse {
	token: string;
	user: User;
}

export function register(data: { username: string; email: string; password: string }) {
	return apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) });
}

export function login(data: { identifier: string; password: string }) {
	return apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) });
}

export function getCurrentUser() {
	return apiFetch<User>('/auth/me');
}
