import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";

const suggestionsRoute = new Hono<{ Variables: AuthVariables }>();

suggestionsRoute.use('*', authMiddleware);
suggestionsRoute.use('*', requireVerified);

suggestionsRoute.get('/', async () => {

});
export default suggestionsRoute;