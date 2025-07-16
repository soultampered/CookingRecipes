import { Hono } from 'hono';
import recipeRoutes from './routes/recipes.js';

const app = new Hono();

app.route('/recipes', recipeRoutes);

// Example root
app.get('/', (c) => c.text('API is running'));

export default app;
