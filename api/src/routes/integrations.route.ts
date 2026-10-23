import { Hono } from "hono";
import { z } from "zod";
import { voiceService, MAX_TOKENS } from "../services/voice.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { requireFeature } from "../middleware/requireFeature.middleware.js";
import { featuresService } from "../services/features.service.js";
import { validateJson } from "../middleware/validate.middleware.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";
import { instacartService } from "../services/instacart.service.js";

const integrationsRoute = new Hono<{ Variables: AuthVariables }>();

const voiceLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, prefix: "voice" });

// Lets the app hide unconfigured integrations.
integrationsRoute.get("/status", authMiddleware, async (c) =>
    c.json({ instacart: instacartService.enabled() && featuresService.isOn("instacart", c.get("userId")) }, 200)
);

// Token management uses the normal app session.
integrationsRoute.get("/tokens", authMiddleware, requireVerified, requireFeature("voiceAdd"), async (c) => {
    return c.json(await voiceService.listTokens(c.get("userId")), 200);
});

integrationsRoute.post(
    "/tokens",
    authMiddleware,
    requireVerified,
    requireFeature("voiceAdd"),
    validateJson(z.object({ name: z.string().trim().min(1).max(60) })),
    async (c) => {
        try {
            return c.json(await voiceService.createToken(c.get("userId"), c.req.valid("json").name), 201);
        } catch (err) {
            if ((err as Error).message === "TOO_MANY_TOKENS") {
                return c.json({ error: `You can have ${MAX_TOKENS} voice tokens. Revoke one you no longer use.`, code: "TOO_MANY_TOKENS" }, 409);
            }
            throw err;
        }
    }
);

integrationsRoute.delete("/tokens/:id", authMiddleware, requireVerified, async (c) => {
    const ok = await voiceService.revokeToken(c.req.param("id"), c.get("userId"));
    return ok ? c.body(null, 204) : c.json({ error: "Token not found" }, 404);
});

// Shortcuts / IFTTT with `Bearer stk_…`; replies with a sentence to read back.
integrationsRoute.post(
    "/voice/add",
    voiceLimiter,
    validateJson(z.object({ text: z.string().trim().min(1).max(500), list: z.string().trim().max(200).optional() })),
    async (c) => {
        const header = c.req.header("Authorization");
        const userId = header?.startsWith("Bearer ") ? await voiceService.authenticate(header.slice(7)) : null;
        if (userId === "expired") {
            return c.json(
                { error: "Token expired", code: "TOKEN_EXPIRED", speech: "This Stokpot voice token has expired. Make a new one in the Stokpot app." },
                401
            );
        }
        if (!userId) return c.json({ error: "Invalid token", speech: "Stokpot couldn't sign you in." }, 401);
        if (!featuresService.isOn("voiceAdd", userId)) return c.json({ error: "Not found" }, 404);
        try {
            const { text, list } = c.req.valid("json");
            const result = await voiceService.addSpoken(userId, text, list);
            return c.json({ speech: result.speech, listId: result.list._id }, 200);
        } catch (err) {
            if ((err as Error).message === "NOTHING_HEARD") {
                return c.json({ error: "No items found", speech: "I didn't catch any items." }, 400);
            }
            return c.json({ error: "Failed to add items", speech: "Something went wrong adding that." }, 500);
        }
    }
);

export default integrationsRoute;
