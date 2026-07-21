import { authReady } from '$lib/state/authReady';
import { triggerForceLogout, triggerTokensRefreshed } from '$lib/state/authEvents';

export class ApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

let authToken: string | null = null;
let refreshTokenValue: string | null = null;

export function setAuthToken(token: string | null) {
	authToken = token;
}

export function setRefreshToken(token: string | null) {
	refreshTokenValue = token;
}

// Bare fetch, not routed through apiFetch — apiFetch's own 401 handling below calls this,
// so going through apiFetch here would recurse into that same handling.
async function tryRefresh(): Promise<{ accessToken: string; refreshToken: string } | null> {
	if (!refreshTokenValue) return null;
	try {
		const res = await fetch(`${BASE_URL}/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken: refreshTokenValue })
		});
		if (!res.ok) return null;
		return (await res.json()) as { accessToken: string; refreshToken: string };
	} catch {
		return null;
	}
}

export async function apiFetch<T>(
	path: string,
	options: RequestInit = {},
	_isRetry = false
): Promise<T> {
	await authReady;
	const res = await fetch(`${BASE_URL}${path}`, {
		headers: {
			'Content-Type': 'application/json',
			...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
			...options.headers
		},
		...options
	});

	if (res.status === 401 && !_isRetry) {
		const body = await res
			.clone()
			.json()
			.catch(() => null);
		if (body?.code === 'TOKEN_EXPIRED') {
			const refreshed = await tryRefresh();
			if (refreshed) {
				setAuthToken(refreshed.accessToken);
				setRefreshToken(refreshed.refreshToken);
				triggerTokensRefreshed(refreshed);
				return apiFetch<T>(path, options, true);
			}
		}
		triggerForceLogout();
	}

	if (!res.ok) {
		let message = `Request failed (${res.status})`;
		try {
			const body = await res.json();
			if (body?.error) message = body.error;
		} catch {
			// response had no JSON body; fall back to the generic message
		}
		throw new ApiError(res.status, message);
	}

	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}
