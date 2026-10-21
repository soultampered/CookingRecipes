import { Hono } from "hono";
import { nutritionService } from "../services/nutrition.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";

const nutritionRoute = new Hono<{ Variables: AuthVariables }>();

nutritionRoute.use("*", authMiddleware);
nutritionRoute.use("*", requireVerified);

// ?days=1..31 (default 7); ?tz = getTimezoneOffset minutes.
nutritionRoute.get("/summary", async (c) => {
    const days = Number(c.req.query("days") ?? 7);
    const tz = Number(c.req.query("tz") ?? 0);
    if (!Number.isInteger(days) || days < 1 || days > 31 || !Number.isFinite(tz) || Math.abs(tz) > 14 * 60) {
        return c.json({ error: "Invalid days or tz" }, 400);
    }
    try {
        return c.json(await nutritionService.summary(c.get("userId"), days, tz), 200);
    } catch {
        return c.json({ error: "Failed to load nutrition" }, 500);
    }
});

// Undo of a prepare (the app's toast) also takes back its nutrition.
nutritionRoute.delete("/preparations/:id", async (c) => {
    try {
        const removed = await nutritionService.removePreparation(c.get("userId"), c.req.param("id"));
        return removed ? c.body(null, 204) : c.json({ error: "Preparation not found" }, 404);
    } catch {
        return c.json({ error: "Failed to remove preparation" }, 500);
    }
});

export default nutritionRoute;
