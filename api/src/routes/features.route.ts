import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { featuresService } from "../services/features.service.js";

// Flags on for the caller. The app only hides entry points; requireFeature enforces.
const featuresRoute = new Hono<{ Variables: AuthVariables }>();

featuresRoute.get("/", authMiddleware, (c) => c.json({ enabled: featuresService.enabledFor(c.get("userId")) }, 200));

export default featuresRoute;
