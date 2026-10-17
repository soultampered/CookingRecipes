import { apiFetch } from './client';
import type { User } from '$lib/types/user';

export interface AuthResponse {
	accessToken: string;
	refreshToken: string;
	user: User;
}

export function register(data: { username: string; email: string; password: string }) {
	return apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) });
}

// STO-32: accounts with 2FA get a challenge instead of tokens.
export interface TwoFactorChallenge {
	twoFactorRequired: true;
	challengeId: string;
}

export function login(data: { identifier: string; password: string }) {
	return apiFetch<AuthResponse | TwoFactorChallenge>('/auth/login', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export function verifyLoginCode(challengeId: string, code: string) {
	return apiFetch<AuthResponse>('/auth/login/verify', {
		method: 'POST',
		body: JSON.stringify({ challengeId, code })
	});
}

export function setTwoFactor(enabled: boolean, password: string) {
	return apiFetch<User>('/auth/2fa', { method: 'POST', body: JSON.stringify({ enabled, password }) });
}

export function getCurrentUser() {
	return apiFetch<User>('/auth/me');
}

export function verifyEmail(code: string) {
	return apiFetch<User>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ code }) });
}

export function resendCode() {
	return apiFetch<{ message: string }>('/auth/resend-code', { method: 'POST' });
}

export function requestPasswordReset(identifier: string) {
	return apiFetch<{ message: string }>('/auth/forgot-password', {
		method: 'POST',
		body: JSON.stringify({ identifier })
	});
}

export function resetPassword(data: { identifier: string; code: string; newPassword: string }) {
	return apiFetch<{ message: string }>('/auth/reset-password', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export function logout(refreshToken: string) {
	return apiFetch<{ message: string }>('/auth/logout', {
		method: 'POST',
		body: JSON.stringify({ refreshToken })
	});
}

// STO-33
export interface SessionSummary {
	id: string;
	createdAt?: string;
	lastUsedAt?: string;
	userAgent?: string;
	current: boolean;
}

export function listSessions(refreshToken: string | null) {
	return apiFetch<SessionSummary[]>('/auth/sessions', {
		method: 'POST',
		body: JSON.stringify(refreshToken ? { refreshToken } : {})
	});
}

export function revokeSession(id: string) {
	return apiFetch<void>(`/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function revokeOtherSessions(refreshToken: string) {
	return apiFetch<{ message: string }>('/auth/sessions/revoke-others', {
		method: 'POST',
		body: JSON.stringify({ refreshToken })
	});
}
