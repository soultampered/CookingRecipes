import { Hono } from "hono";
import { priceHistoryService } from "../services/priceHistory.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { requireFeature } from "../middleware/requireFeature.middleware.js";

const pricesRoute = new Hono<{ Variables: AuthVariables }>();

pricesRoute.use("*", authMiddleware);
pricesRoute.use("*", requireVerified);
pricesRoute.use("*", requireFeature("priceWatch"));

// ?names=Milk&names=Eggs → { [normalized name]: insight }
pricesRoute.get("/insights", async (c) => {
    const names = (c.req.queries("names") ?? []).filter((n) => n.trim()).map((n) => n.slice(0, 200));
    if (!names.length) return c.json({}, 200);
    try {
        return c.json(await priceHistoryService.insights(c.get("userId"), names), 200);
    } catch {
        return c.json({ error: "Failed to load prices" }, 500);
    }
});

export default pricesRoute;
