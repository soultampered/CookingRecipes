import { Hono } from "hono";
import { barcodeService } from "../services/barcode.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";

const barcodeRoute = new Hono<{ Variables: AuthVariables }>();

barcodeRoute.use("*", authMiddleware);
barcodeRoute.use("*", requireVerified);

// Shields Open Food Facts from a scan loop.
const lookupLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, prefix: "barcode" });

// STO-23: EAN-8/UPC-A/EAN-13/GTIN-14
barcodeRoute.get("/:code", lookupLimiter, async (c) => {
    const code = c.req.param("code");
    if (!/^\d{8,14}$/.test(code)) return c.json({ error: "Not a product barcode" }, 400);
    try {
        const product = await barcodeService.lookup(code);
        if (!product) return c.json({ error: "Product not found", code }, 404);
        return c.json(product, 200);
    } catch {
        return c.json({ error: "Barcode lookup unavailable" }, 502);
    }
});

export default barcodeRoute;
