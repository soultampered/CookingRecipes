import type { MiddlewareHandler } from "hono";
import { userModel } from "../models/user.model.js";
import type { AuthVariables } from "./auth.middleware.js";

export const requireVerified: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
    try {
        const user = await userModel.findById(c.get("userId"));
        if (user.mustResetPassword) {
            return c.json({ error: "Password reset required", code: "PASSWORD_RESET_REQUIRED" }, 403);
        }
        if (!user.emailVerified) {
            return c.json({ error: "Email not verified", code: "EMAIL_NOT_VERIFIED" }, 403);
        }
        await next();
    } catch {
        return c.json({ error: "Unauthorized" }, 401);
    }
};
