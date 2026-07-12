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

export default authRoute;
