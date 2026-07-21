// Dependency-free callback registry, mirroring authReady.ts's precedent — this is how
// client.ts signals "log the user out" or "persist these new tokens" up to session.svelte.ts
// without creating a session.svelte.ts <-> client.ts circular import.

let forceLogoutHandler: (() => void) | null = null;
let tokensRefreshedHandler: ((tokens: { accessToken: string; refreshToken: string }) => void) | null = null;

export function onForceLogout(handler: () => void) {
	forceLogoutHandler = handler;
}

export function triggerForceLogout() {
	forceLogoutHandler?.();
}

export function onTokensRefreshed(handler: (tokens: { accessToken: string; refreshToken: string }) => void) {
	tokensRefreshedHandler = handler;
}

export function triggerTokensRefreshed(tokens: { accessToken: string; refreshToken: string }) {
	tokensRefreshedHandler?.(tokens);
}
