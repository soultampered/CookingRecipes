import { Hono, type Context } from "hono";
import { mealPlanService } from "../services/mealPlan.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { validateJson } from "../middleware/validate.middleware.js";
import {
    addMealPlanSchema,
    updateMealPlanSchema,
    mealPlanRangeSchema,
    mealPlanShoppingListSchema
} from "../schemas/mealPlan.schema.js";

// STO-9
const mealPlanRoute = new Hono<{ Variables: AuthVariables }>();

mealPlanRoute.use("*", authMiddleware);
mealPlanRoute.use("*", requireVerified);

function fail(c: Context, err: unknown) {
    const message = (err as Error).message;
    if (message === "NOT_FOUND") return c.json({ error: "Plan entry not found" }, 404);
    if (message === "FORBIDDEN") return c.json({ error: "Forbidden" }, 403);
    if (message === "UNKNOWN_RECIPE") return c.json({ error: "Recipe not found" }, 404);
    return c.json({ error: "Failed to update meal plan" }, 500);
}

mealPlanRoute.get("/", async (c) => {
    const range = mealPlanRangeSchema.safeParse({ from: c.req.query("from"), to: c.req.query("to") });
    if (!range.success || range.data.from > range.data.to) return c.json({ error: "from/to must be YYYY-MM-DD" }, 400);
    return c.json(await mealPlanService.list(c.get("userId"), range.data.from, range.data.to), 200);
});

mealPlanRoute.post("/", validateJson(addMealPlanSchema), async (c) => {
    try {
        return c.json(await mealPlanService.add(c.get("userId"), c.req.valid("json")), 201);
    } catch (err) {
        return fail(c, err);
    }
});

// STO-87: one deduplicated list of what's short for every recipe planned in [from, to].
mealPlanRoute.post("/shopping-list", validateJson(mealPlanShoppingListSchema), async (c) => {
    const { from, to, name } = c.req.valid("json");
    if (from > to) return c.json({ error: "from must be before to" }, 400);
    try {
        return c.json(await mealPlanService.buildShoppingList(c.get("userId"), from, to, name), 201);
    } catch (err) {
        if ((err as Error).message === "EMPTY_PLAN") return c.json({ error: "Nothing planned in that range" }, 400);
        return fail(c, err);
    }
});

mealPlanRoute.patch("/:id", validateJson(updateMealPlanSchema), async (c) => {
    try {
        return c.json(await mealPlanService.update(c.req.param("id"), c.get("userId"), c.req.valid("json")), 200);
    } catch (err) {
        return fail(c, err);
    }
});

mealPlanRoute.delete("/:id", async (c) => {
    try {
        await mealPlanService.remove(c.req.param("id"), c.get("userId"));
        return c.body(null, 204);
    } catch (err) {
        return fail(c, err);
    }
});

export default mealPlanRoute;
