import { Hono, type Context } from "hono";
import { householdService } from "../services/household.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { validateJson } from "../middleware/validate.middleware.js";
import { householdNameSchema, joinHouseholdSchema } from "../schemas/household.schema.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";

// Invite codes are guessable in principle — cap attempts.
const joinLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: "household-join" });

// STO-88
const householdRoute = new Hono<{ Variables: AuthVariables }>();

householdRoute.use("*", authMiddleware);
householdRoute.use("*", requireVerified);

export function householdError(c: Context, err: unknown) {
    const message = (err as Error).message;
    if (message === "NOT_FOUND") return c.json({ error: "Household not found" }, 404);
    if (message === "FORBIDDEN") return c.json({ error: "Only the owner can do that" }, 403);
    if (message === "INVALID_CODE") return c.json({ error: "That invite code isn't valid" }, 400);
    if (message === "FULL") return c.json({ error: "That household is full" }, 409);
    if (message === "OWNER_CANNOT_LEAVE") return c.json({ error: "The owner can't leave — delete it or transfer it first" }, 400);
    return c.json({ error: "Failed to update household" }, 500);
}

householdRoute.get("/", async (c) => c.json(await householdService.list(c.get("userId")), 200));

householdRoute.post("/", validateJson(householdNameSchema), async (c) => {
    return c.json(await householdService.create(c.get("userId"), c.req.valid("json").name), 201);
});

// STO-8
householdRoute.post("/join", joinLimiter, validateJson(joinHouseholdSchema), async (c) => {
    try {
        return c.json(await householdService.join(c.get("userId"), c.req.valid("json").code), 200);
    } catch (err) {
        return householdError(c, err);
    }
});

householdRoute.post("/:id/invite", async (c) => {
    try {
        return c.json(await householdService.createInvite(c.req.param("id"), c.get("userId")), 200);
    } catch (err) {
        return householdError(c, err);
    }
});

householdRoute.delete("/:id/invite", async (c) => {
    try {
        return c.json(await householdService.revokeInvite(c.req.param("id"), c.get("userId")), 200);
    } catch (err) {
        return householdError(c, err);
    }
});

householdRoute.post("/:id/leave", async (c) => {
    try {
        await householdService.leave(c.req.param("id"), c.get("userId"));
        return c.body(null, 204);
    } catch (err) {
        return householdError(c, err);
    }
});

householdRoute.delete("/:id/members/:memberId", async (c) => {
    try {
        return c.json(await householdService.removeMember(c.req.param("id"), c.get("userId"), c.req.param("memberId")), 200);
    } catch (err) {
        return householdError(c, err);
    }
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
