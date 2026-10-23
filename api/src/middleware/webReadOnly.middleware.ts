import type { MiddlewareHandler } from "hono";
import { featuresService } from "../services/features.service.js";
import { userIdFromAuthHeader } from "./auth.middleware.js";

// Web is view-only until webEditing (2.6): browser-origin writes are refused. App origins,
// origin-less callers and auth are exempt.
const APP_ORIGINS = new Set(["capacitor://localhost", "http://localhost", "https://localhost"]);
const READS = new Set(["GET", "HEAD", "OPTIONS"]);

export const webReadOnly: MiddlewareHandler = async (c, next) => {
    const origin = c.req.header("Origin");
    if (READS.has(c.req.method) || !origin || APP_ORIGINS.has(origin) || c.req.path.startsWith("/auth/")) return next();
    if (featuresService.isOn("webEditing", userIdFromAuthHeader(c.req.header("Authorization")))) return next();
    return c.json({ error: "The web version is view-only for now. Make changes in the Stokpot app.", code: "WEB_READ_ONLY" }, 403);
};
