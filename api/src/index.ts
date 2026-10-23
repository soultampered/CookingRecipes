import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders, NONCE, type SecureHeadersVariables } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import recipeRoutes from './routes/recipes.route.js';
import inventoryRoutes from "./routes/inventory.route.js";
import shoppingListRoute from "./routes/shoppingList.route.js"
import usersRoute from "./routes/users.route.js";
import authRoute from "./routes/auth.route.js";
import featuresRoute from "./routes/features.route.js";
import nutritionRoute from "./routes/nutrition.route.js";
import collectionRoute from "./routes/recipeCollection.route.js";
import publicRoute, { publicPages } from "./routes/public.route.js";
import pricesRoute from "./routes/prices.route.js";
import mealPlanRoute from "./routes/mealPlan.route.js";
import photosRoute from "./routes/photos.route.js";
import barcodeRoute from "./routes/barcode.route.js";

const app = new Hono<{ Variables: SecureHeadersVariables }>();

// Let the app's origins load photos via <img>.
const defaultSecureHeaders = secureHeaders();
const photoSecureHeaders = secureHeaders({ crossOriginResourcePolicy: 'cross-origin' });
app.use('*', (c, next) => (c.req.path.startsWith('/photos/') ? photoSecureHeaders(c, next) : defaultSecureHeaders(c, next)));

// JSON bodies stay under 1MB; photo upload enforces its own 5MB.
const jsonBodyLimit = bodyLimit({
    maxSize: 1 * 1024 * 1024,
    onError: (c) => c.json({ error: 'Request body too large' }, 413)
});
app.use('*', (c, next) => (c.req.method === 'POST' && c.req.path === '/photos' ? next() : jsonBodyLimit(c, next)));

// Capacitor's WebView sends these origins by default (iOS: capacitor://localhost,
// Android: http://localhost); https://localhost covers a custom server.hostname/scheme
// setup. Vite dev server origins are for local mobile-app development against a local
// or remote API. Extra origins (e.g. a future web client's real domain) can be added
// via CORS_ORIGIN without touching this default set.
const DEFAULT_ALLOWED_ORIGINS = [
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
    'http://localhost:5173',
    'http://localhost:5174',
];
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : DEFAULT_ALLOWED_ORIGINS;

app.use('*', cors({ origin: allowedOrigins }));

app.route('/auth', authRoute);
app.route('/recipes', recipeRoutes);
app.route('/inventory', inventoryRoutes);
app.route('/shopping-lists', shoppingListRoute);
app.route('/users', usersRoute);
app.route('/features', featuresRoute);
app.route('/nutrition', nutritionRoute);
app.route('/collections', collectionRoute);
app.route('/prices', pricesRoute);
app.route('/meal-plan', mealPlanRoute);
app.route('/photos', photosRoute);
app.route('/barcode', barcodeRoute);
// No auth: /public/recipes/:token and /r/:token.
app.route('/public', publicRoute);
app.route('/', publicPages);

// This page has no scripts and one small server-authored inline <style> block (no user
// input reflected into it), so the tightest CSP that still lets the style render is
// default-src 'none' plus a per-request nonce scoped to just that one style tag —
// tighter than 'unsafe-inline', which would allow *any* inline style/script wholesale.
app.use(
    '/',
    secureHeaders({
        contentSecurityPolicy: {
            defaultSrc: ["'none'"],
            styleSrc: [NONCE],
            baseUri: ["'none'"],
            frameAncestors: ["'none'"]
        }
    })
);

app.get('/', (c) => {
    // secureHeaders' CSP callback (the NONCE directive above) runs before this handler and
    // already generated + stored the nonce it put in the header — read it back rather than
    // generating a second one, or the header and the <style> tag would disagree.
    const nonce = c.get('secureHeadersNonce');
    return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Recipe API</title>
        <style nonce="${nonce}">
          body {
            font-family: sans-serif;
            max-width: 600px;
            margin: 3rem auto;
            padding: 1rem;
            line-height: 1.6;
          }
          h1 { color: #4F46E5; }
        </style>
      </head>
      <body>
        <h1>Recipe API</h1>
        <p>Your API is running!</p>
        <p>Available endpoints:</p>
        <ul>
          <li><code>/recipes</code> - List all recipes</li>
          <li><code>/inventory</code> - List all inventory</li>
          <li><code>/shopping-list</code> - List all shopping lists</li>
        </ul>
      </body>
    </html>
  `);
});

export default app;
