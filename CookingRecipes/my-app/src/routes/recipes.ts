
import { Hono } from 'hono';

const recipeRoutes = new Hono();

recipeRoutes.get('/', async (c) => {
    // Replace with real DB fetch
    return c.json([{ id: '1', name: 'Spaghetti Bolognese' }]);
});

recipeRoutes.post('/', async (c) => {
    const body = await c.req.json();
    // Replace with real DB insert
    return c.json({ message: 'Recipe created', recipe: body }, 201);
});

recipeRoutes.get('/:id', async (c) => {
    const id = c.req.param('id');
    // Replace with real DB fetch
    return c.json({ id, name: 'Example Recipe' });
});

export default recipeRoutes;
