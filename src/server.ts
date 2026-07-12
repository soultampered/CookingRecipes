import { serve } from "@hono/node-server";
import 'dotenv/config';
import app from "./index.js";

const port = parseInt(process.env.PORT || '3000');

serve({
    fetch: app.fetch,
    port,
});

console.log(`Server is running at http://localhost:${port}`);
