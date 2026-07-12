import { Hono } from "hono";
import type { NewUser } from "../types/user.js";
import { authService } from "../services/auth.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";

const authRoute = new Hono<{ Variables: AuthVariables }>();

authRoute.post("/register", async (c) => {
    try {
        const body = await c.req.json<NewUser>();
        const result = await authService.register(body);
        return c.json(result, 201);
    } catch (err) {
        if ((err as Error).message === "DUPLICATE_NAME") {
            return c.json({ error: "Username or email already in use" }, 400);
        }
        return c.json({ error: "Failed to register" }, 500);
    }
});

authRoute.post("/login", async (c) => {
    try {
        const body = await c.req.json<{ identifier: string; password: string }>();
        const result = await authService.login(body.identifier, body.password);
        return c.json(result, 200);
    } catch (err) {
        if ((err as Error).message === "INVALID_CREDENTIALS") {
            return c.json({ error: "Invalid username/email or password" }, 401);
        }
        return c.json({ error: "Failed to log in" }, 500);
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

authRoute.post("/verify-email", authMiddleware, async (c) => {
    try {
        const { code } = await c.req.json<{ code: string }>();
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
        return c.json({ error: "Failed to verify email" }, 500);
    }
});

authRoute.post("/resend-code", authMiddleware, async (c) => {
    try {
        await authService.resendCode(c.get("userId"));
        return c.json({ message: "Verification code sent" }, 200);
    } catch {
        return c.json({ error: "Failed to resend code" }, 500);
    }
});

export default authRoute;
