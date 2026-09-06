import type { MiddlewareHandler } from "hono";
import jwt from "jsonwebtoken";
import { verificationSecrets } from "../services/jwtSecrets.js";
import { tokenRevocation } from "../services/tokenRevocation.js";

export type AuthVariables = {
    userId: string;
    accessToken: string;
    accessTokenExp: number;
};

// Tries each verification secret in turn (current, then JWT_SECRET_PREVIOUS if set) so a
// token signed just before a rotation still verifies — see jwtSecrets.ts for the rotation
// plan. A TokenExpiredError from any secret means that secret's signature was valid and
// only expiry failed, which is more informative than a signature mismatch against a
// different secret — so it takes priority when deciding which error to report.
function verifyWithAnySecret(token: string): { userId: string; exp: number } {
    let bestError: unknown;
    for (const secret of verificationSecrets) {
        try {
            return jwt.verify(token, secret) as { userId: string; exp: number };
        } catch (err) {
            if (!bestError || (err as Error).name === "TokenExpiredError") {
                bestError = err;
            }
        }
    }
    throw bestError;
}

export const authMiddleware: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
    const header = c.req.header("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    if (tokenRevocation.isRevoked(token)) {
        return c.json({ error: "Access token expired", code: "TOKEN_EXPIRED" }, 401);
    }

    try {
        const payload = verifyWithAnySecret(token);
        c.set("userId", payload.userId);
        c.set("accessToken", token);
        c.set("accessTokenExp", payload.exp);
        await next();
    } catch (err) {
        if ((err as Error).name === "TokenExpiredError") {
            return c.json({ error: "Access token expired", code: "TOKEN_EXPIRED" }, 401);
        }
        return c.json({ error: "Invalid token", code: "TOKEN_INVALID" }, 401);
    }
};
