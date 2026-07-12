export class ApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
	const res = await fetch(`${BASE_URL}${path}`, {
		headers: { 'Content-Type': 'application/json', ...options.headers },
		...options
	});

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
