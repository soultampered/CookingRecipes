import type { MiddlewareHandler } from "hono";
import { featuresService } from "../services/features.service.js";
import type { FeatureKey } from "../config/features.js";

// Unreleased feature = 404. Mount after authMiddleware so flags evaluate per user.
export function requireFeature(key: FeatureKey): MiddlewareHandler {
    return async (c, next) => {
        if (!featuresService.isOn(key, c.get("userId") as string | undefined)) return c.json({ error: "Not found" }, 404);
        await next();
    };
}
