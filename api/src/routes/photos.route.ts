import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { photoService, MAX_PHOTO_BYTES } from "../services/photo.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";
import { requireFeature } from "../middleware/requireFeature.middleware.js";

// Raw image body, already resized by the client.
const photosRoute = new Hono<{ Variables: AuthVariables }>();

photosRoute.post(
    "/",
    authMiddleware,
    requireVerified,
    requireFeature("photos"),
    rateLimit({ windowMs: 10 * 60 * 1000, max: 30, prefix: "photo-upload" }),
    bodyLimit({ maxSize: MAX_PHOTO_BYTES, onError: (c) => c.json({ error: "Photo too large (max 5MB)" }, 413) }),
    async (c) => {
        try {
            const token = await photoService.upload(c.get("userId"), Buffer.from(await c.req.arrayBuffer()));
            return c.json({ id: token, url: `/photos/${token}` }, 201);
        } catch (err) {
            const message = (err as Error).message;
            if (message === "BAD_TYPE") return c.json({ error: "Only JPEG, PNG or WebP images" }, 400);
            if (message === "BAD_SIZE") return c.json({ error: "Photo is empty or too large" }, 400);
            if (message === "QUOTA") return c.json({ error: "Photo storage is full. Remove some photos first.", code: "PHOTO_QUOTA" }, 413);
            return c.json({ error: "Failed to upload photo" }, 500);
        }
    }
);

// Public by unguessable token so <img> works without auth.
photosRoute.get("/:token", async (c) => {
    const photo = await photoService.get(c.req.param("token"));
    if (!photo) return c.json({ error: "Photo not found" }, 404);
    // CORP is relaxed for /photos/* in index.ts.
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    c.header("Content-Type", photo.contentType);
    return c.body(new Uint8Array(photo.data));
});

export default photosRoute;
