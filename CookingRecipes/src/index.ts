import { Hono } from 'hono';
import recipeRoutes from './routes/recipes.route.js';

const app = new Hono();

app.route('/recipes', recipeRoutes);

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
        <h1>🍽️ Recipe API</h1>
        <p>Your API is running!</p>
        <p>Available endpoints:</p>
        <ul>
          <li><code>/recipes</code> - List all recipes</li>
          <li><code>/inventory</code> - List all inventory</li>
          <li><code>/shoppingList</code> - List all shopping lists</li>
        </ul>
      </body>
    </html>
  `)
);

export default app;
