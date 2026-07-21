import type { MiddlewareHandler } from "hono";
import jwt from "jsonwebtoken";

export type AuthVariables = {
    userId: string;
};

export const authMiddleware: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
    const header = c.req.header("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        c.set("userId", payload.userId);
        await next();
    } catch (err) {
        if ((err as Error).name === "TokenExpiredError") {
            return c.json({ error: "Access token expired", code: "TOKEN_EXPIRED" }, 401);
        }
        return c.json({ error: "Invalid token", code: "TOKEN_INVALID" }, 401);
    }
};
