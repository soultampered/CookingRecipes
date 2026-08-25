import { authReady } from '$lib/state/authReady';
import { triggerForceLogout, triggerTokensRefreshed } from '$lib/state/authEvents';

export class ApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

// A dropped/never-established connection (offline, DNS failure, timeout), as opposed to a
// normal HTTP error response. Extends ApiError so the `err instanceof ApiError ? err.message
// : '...'` pattern already used at every call site surfaces this message for free.
export class NetworkError extends ApiError {
	constructor(message = "You're offline. Check your connection and try again.") {
		super(0, message);
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

function isOffline() {
	return typeof navigator !== 'undefined' && navigator.onLine === false;
}

// Bounded wait for the browser to report connectivity restored, so a request retries once
// automatically instead of just failing — but never hangs indefinitely if the device stays
// offline.
function waitForOnline(timeoutMs = 10_000): Promise<boolean> {
	if (!isOffline()) return Promise.resolve(true);
	if (typeof window === 'undefined') return Promise.resolve(false);
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			window.removeEventListener('online', onOnline);
			resolve(false);
		}, timeoutMs);
		function onOnline() {
			clearTimeout(timer);
			window.removeEventListener('online', onOnline);
			resolve(true);
		}
		window.addEventListener('online', onOnline);
	});
}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
	if (isOffline()) throw new NetworkError();
	try {
		return await fetch(`${BASE_URL}${path}`, init);
	} catch {
		throw new NetworkError();
	}
}

export async function apiFetch<T>(
	path: string,
	options: RequestInit = {},
	_isAuthRetry = false,
	_isNetworkRetry = false
): Promise<T> {
	await authReady;

	const init: RequestInit = {
		headers: {
			'Content-Type': 'application/json',
			...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
			...options.headers
		},
		...options
	};

	let res: Response;
	try {
		res = await rawFetch(path, init);
	} catch (err) {
		if (err instanceof NetworkError && !_isNetworkRetry && (await waitForOnline())) {
			return apiFetch<T>(path, options, _isAuthRetry, true);
		}
		throw err;
	}

	if (res.status === 401 && !_isAuthRetry) {
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
				return apiFetch<T>(path, options, true, _isNetworkRetry);
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
