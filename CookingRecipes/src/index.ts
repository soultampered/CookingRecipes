import { Hono } from 'hono';
import recipeRoutes from './routes/recipes.route.js';
import inventoryRoutes from "./routes/inventory.route.js";
import shoppingListRoute from "./routes/shoppingList.route.js"
import suggestionsRoute from "./routes/suggestions.route.js";
import usersRoute from "./routes/users.route.js";

const app = new Hono();

app.route('/recipes', recipeRoutes);
app.route('/inventory', inventoryRoutes);
app.route('/shopping-lists', shoppingListRoute);
app.route('/suggestions', suggestionsRoute);
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
