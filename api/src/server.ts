import { serve } from "@hono/node-server";
import 'dotenv/config';
import app from "./index.js";
import { featuresService } from "./services/features.service.js";
import { startPhotoSweep } from "./services/photo.service.js";

const port = parseInt(process.env.PORT || '3000');

// Load flags before serving (3 s cap).
await featuresService.init().catch((err) => console.error("Feature flags failed to start:", err));

serve({
    fetch: app.fetch,
    port,
});

startPhotoSweep();

console.log(`Server is running at http://localhost:${port}`);
