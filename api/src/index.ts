import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import recipeRoutes from './routes/recipes.route.js';
import inventoryRoutes from "./routes/inventory.route.js";
import shoppingListRoute from "./routes/shoppingList.route.js"
import usersRoute from "./routes/users.route.js";
import authRoute from "./routes/auth.route.js";

const app = new Hono();

app.use('*', secureHeaders());

// No route accepts file uploads — every body is JSON, so 1MB comfortably covers the
// largest legitimate payload (a recipe with a long instructions/ingredients list) with
// plenty of headroom, while still capping an oversized-payload DoS attempt.
app.use(
    '*',
    bodyLimit({
        maxSize: 1 * 1024 * 1024,
        onError: (c) => c.json({ error: 'Request body too large' }, 413)
    })
);

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

// Example root
app.get('/', (c) =>   c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Recipe API</title>
        <style>
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
  `)
);

export default app;
