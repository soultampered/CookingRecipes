import { Hono } from "hono";
import { authService } from "../services/auth.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";
import { tokenRevocation } from "../services/tokenRevocation.js";
import { validateJson } from "../middleware/validate.middleware.js";
import {
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    refreshTokenSchema,
    listSessionsSchema,
    verifyLoginCodeSchema,
    setTwoFactorSchema
} from "../schemas/auth.schema.js";

const authRoute = new Hono<{ Variables: AuthVariables }>();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: "login" });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, prefix: "register" });
const passwordResetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: "password-reset" });
const resendCodeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: "resend-code" });

authRoute.post("/register", registerLimiter, validateJson(registerSchema), async (c) => {
    try {
        const body = c.req.valid("json");
        const result = await authService.register(body, c.req.header("User-Agent"));
        return c.json(result, 201);
    } catch (err) {
        const message = (err as Error).message;
        if (message === "DUPLICATE_NAME") {
            return c.json({ error: "Username or email already in use" }, 400);
        }
        if (message === "WEAK_PASSWORD") {
            return c.json({ error: "Password must be at least 8 characters and include a letter and a number" }, 400);
        }
        return c.json({ error: "Failed to register" }, 500);
    }
});

authRoute.post("/login", loginLimiter, validateJson(loginSchema), async (c) => {
    try {
        const body = c.req.valid("json");
        const result = await authService.login(body.identifier, body.password, c.req.header("User-Agent"));
        return c.json(result, 200);
    } catch (err) {
        const message = (err as Error).message;
        if (message === "INVALID_CREDENTIALS") {
            return c.json({ error: "Invalid username/email or password" }, 401);
        }
        if (message === "ACCOUNT_LOCKED") {
            return c.json({ error: "Too many failed attempts, please try again later" }, 423);
        }
        if (message === "CODE_SEND_FAILED") {
            return c.json({ error: "Could not send your sign-in code, try again" }, 503);
        }
        return c.json({ error: "Failed to log in" }, 500);
    }
});

// 2FA login, step two. Shares the login limiter.
authRoute.post("/login/verify", loginLimiter, validateJson(verifyLoginCodeSchema), async (c) => {
    try {
        const { challengeId, code } = c.req.valid("json");
        const result = await authService.verifyLoginCode(challengeId, code, c.req.header("User-Agent"));
        return c.json(result, 200);
    } catch (err) {
        const message = (err as Error).message;
        if (message === "CODE_EXPIRED") {
            return c.json({ error: "Code expired, sign in again" }, 400);
        }
        if (message === "TOO_MANY_ATTEMPTS") {
            return c.json({ error: "Too many incorrect attempts, sign in again" }, 429);
        }
        if (message === "INVALID_CODE") {
            return c.json({ error: "Incorrect code" }, 400);
        }
        return c.json({ error: "Failed to verify code" }, 500);
    }
});

authRoute.post("/2fa", authMiddleware, validateJson(setTwoFactorSchema), async (c) => {
    try {
        const { enabled, password } = c.req.valid("json");
        const user = await authService.setTwoFactor(c.get("userId"), enabled, password);
        return c.json(user, 200);
    } catch (err) {
        if ((err as Error).message === "INVALID_CREDENTIALS") {
            // 403 not 401: the mobile client treats any 401 as a dead session.
            return c.json({ error: "Incorrect password" }, 403);
        }
        return c.json({ error: "Failed to update two-factor setting" }, 500);
    }
});

authRoute.get("/me", authMiddleware, async (c) => {
    try {
        const user = await authService.getCurrentUser(c.get("userId"));
        return c.json(user, 200);
    } catch {
        return c.json({ error: "User not found" }, 404);
    }
});

authRoute.post("/verify-email", authMiddleware, validateJson(verifyEmailSchema), async (c) => {
    try {
        const { code } = c.req.valid("json");
        const user = await authService.verifyEmail(c.get("userId"), code);
        return c.json(user, 200);
    } catch (err) {
        const message = (err as Error).message;
        if (message === "INVALID_CODE") {
            return c.json({ error: "Incorrect verification code" }, 400);
        }
        if (message === "CODE_EXPIRED") {
            return c.json({ error: "Verification code has expired, request a new one" }, 400);
        }
        if (message === "TOO_MANY_ATTEMPTS") {
            return c.json({ error: "Too many incorrect attempts, request a new code" }, 429);
        }
        return c.json({ error: "Failed to verify email" }, 500);
    }
});

authRoute.post("/forgot-password", passwordResetLimiter, validateJson(forgotPasswordSchema), async (c) => {
    const { identifier } = c.req.valid("json");
    await authService.requestPasswordReset(identifier);
    // Always the same response, regardless of what actually happened server-side —
    // see the comment on authService.requestPasswordReset for why.
    return c.json({ message: "If that account exists, a reset code has been sent" }, 200);
});

authRoute.post("/reset-password", passwordResetLimiter, validateJson(resetPasswordSchema), async (c) => {
    try {
        const { identifier, code, newPassword } = c.req.valid("json");
        await authService.resetPassword(identifier, code, newPassword);
        return c.json({ message: "Password reset successful" }, 200);
    } catch (err) {
        if ((err as Error).message === "WEAK_PASSWORD") {
            return c.json({ error: "Password must be at least 8 characters and include a letter and a number" }, 400);
        }
        return c.json({ error: "Invalid or expired code" }, 400);
    }
});

authRoute.post("/resend-code", authMiddleware, resendCodeLimiter, async (c) => {
    try {
        await authService.resendCode(c.get("userId"));
        return c.json({ message: "Verification code sent" }, 200);
    } catch (err) {
        if ((err as Error).message === "COOLDOWN_ACTIVE") {
            return c.json({ error: "Please wait a bit before requesting another code" }, 429);
        }
        return c.json({ error: "Failed to resend code" }, 500);
    }
});

authRoute.post("/refresh", validateJson(refreshTokenSchema), async (c) => {
    try {
        const { refreshToken } = c.req.valid("json");
        const result = await authService.refreshAccessToken(refreshToken);
        return c.json(result, 200);
    } catch {
        // INVALID_REFRESH_TOKEN and TOKEN_REUSE_DETECTED look identical from here —
        // only the server log (in authService) distinguishes them, so a possibly-malicious
        // caller can't tell which case triggered.
        return c.json({ error: "Invalid or expired refresh token" }, 401);
    }
});

authRoute.get("/security-events", authMiddleware, async (c) => {
    const events = await authService.listSecurityEvents(c.get("userId"));
    return c.json(events, 200);
});

// POST so the refresh token travels in the body, not the URL.
authRoute.post("/sessions", authMiddleware, validateJson(listSessionsSchema), async (c) => {
    const { refreshToken } = c.req.valid("json");
    const sessions = await authService.listSessions(c.get("userId"), refreshToken);
    return c.json(sessions, 200);
});

authRoute.post("/sessions/revoke-others", authMiddleware, validateJson(refreshTokenSchema), async (c) => {
    try {
        await authService.revokeOtherSessions(c.get("userId"), c.req.valid("json").refreshToken);
        return c.json({ message: "Other sessions signed out" }, 200);
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({ error: "Current session not found" }, 404);
        }
        return c.json({ error: "Failed to sign out other sessions" }, 500);
    }
});

authRoute.delete("/sessions/:id", authMiddleware, async (c) => {
    try {
        await authService.revokeSession(c.get("userId"), c.req.param("id"));
        return c.body(null, 204);
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({ error: "Session not found" }, 404);
        }
        return c.json({ error: "Failed to sign out session" }, 500);
    }
});

authRoute.post("/logout", authMiddleware, validateJson(refreshTokenSchema), async (c) => {
    const { refreshToken } = c.req.valid("json");
    await authService.revokeRefreshToken(c.get("userId"), refreshToken);
    tokenRevocation.revoke(c.get("accessToken"), c.get("accessTokenExp") * 1000);
    return c.json({ message: "Logged out" }, 200);
});

export default authRoute;
