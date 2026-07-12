import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";

const suggestionsRoute = new Hono<{ Variables: AuthVariables }>();

suggestionsRoute.use('*', authMiddleware);

suggestionsRoute.get('/', async () => {

});
export default suggestionsRoute;