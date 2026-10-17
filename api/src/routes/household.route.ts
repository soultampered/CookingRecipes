import { Hono, type Context } from "hono";
import { householdService } from "../services/household.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { validateJson } from "../middleware/validate.middleware.js";
import { householdNameSchema } from "../schemas/household.schema.js";

// STO-88
const householdRoute = new Hono<{ Variables: AuthVariables }>();

householdRoute.use("*", authMiddleware);
householdRoute.use("*", requireVerified);

export function householdError(c: Context, err: unknown) {
    const message = (err as Error).message;
    if (message === "NOT_FOUND") return c.json({ error: "Household not found" }, 404);
    if (message === "FORBIDDEN") return c.json({ error: "Only the owner can do that" }, 403);
    return c.json({ error: "Failed to update household" }, 500);
}

householdRoute.get("/", async (c) => c.json(await householdService.list(c.get("userId")), 200));

householdRoute.post("/", validateJson(householdNameSchema), async (c) => {
    return c.json(await householdService.create(c.get("userId"), c.req.valid("json").name), 201);
});

householdRoute.patch("/:id", validateJson(householdNameSchema), async (c) => {
    try {
        return c.json(await householdService.rename(c.req.param("id"), c.get("userId"), c.req.valid("json").name), 200);
    } catch (err) {
        return householdError(c, err);
    }
});

householdRoute.delete("/:id", async (c) => {
    try {
        await householdService.remove(c.req.param("id"), c.get("userId"));
        return c.body(null, 204);
    } catch (err) {
        return householdError(c, err);
    }
});

export default householdRoute;
