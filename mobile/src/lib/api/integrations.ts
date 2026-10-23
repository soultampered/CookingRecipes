import { apiFetch, apiBaseUrl } from './client';

export interface ApiTokenSummary {
	_id: string;
	name: string;
	prefix: string;
	createdAt: string;
	lastUsedAt?: string;
	// Unused for 180 days; the shortcut using it now gets "expired".
	expired?: boolean;
}

export function listTokens() {
	return apiFetch<ApiTokenSummary[]>('/integrations/tokens');
}

export function createToken(name: string) {
	return apiFetch<{ token: string; id: string; prefix: string }>('/integrations/tokens', {
		method: 'POST',
		body: JSON.stringify({ name })
	});
}

export function revokeToken(id: string) {
	return apiFetch<void>(`/integrations/tokens/${id}`, { method: 'DELETE' });
}

export const voiceAddUrl = () => `${apiBaseUrl()}/integrations/voice/add`;
