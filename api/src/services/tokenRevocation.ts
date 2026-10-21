// Access tokens are otherwise fully stateless (authMiddleware only checks signature +
// expiry). This adds a narrow, deliberately temporary exception for logout: the revoked
// token only needs to be remembered until it would have expired on its own (at most
// ACCESS_TOKEN_TTL from auth.service.ts), so an in-memory set is enough — same tradeoff
// as the rate limiter in rateLimit.middleware.ts, fine for Render's single instance.
const revokedTokens = new Map<string, number>();
// Revoked sessions (token families). Access tokens carry `sid`, so revocation is immediate.
const revokedSessions = new Map<string, number>();

setInterval(() => {
    const now = Date.now();
    for (const [token, expiresAt] of revokedTokens) {
        if (expiresAt <= now) revokedTokens.delete(token);
    }
    for (const [sid, until] of revokedSessions) {
        if (until <= now) revokedSessions.delete(sid);
    }
}, 60 * 1000).unref();

export const tokenRevocation = {
    revoke(token: string, expiresAtMs: number): void {
        revokedTokens.set(token, expiresAtMs);
    },

    isRevoked(token: string): boolean {
        return revokedTokens.has(token);
    },

    // untilMs: when that session's newest access token expires anyway.
    revokeSessions(familyIds: string[], untilMs: number): void {
        for (const id of familyIds) revokedSessions.set(id, untilMs);
    },

    isSessionRevoked(familyId: string | undefined): boolean {
        return !!familyId && revokedSessions.has(familyId);
    }
};
