
import { Hono } from 'hono';
import { recipeModel} from "../models/index.js";
import type {Recipe} from "../types/recipe.js";

const recipeRoutes = new Hono();

recipeRoutes.post('/recipes', async (c) => {
    try {
        const body = await c.req.json<Recipe>();
        const newRecipe = await recipeModel.create(body);

        return c.json(newRecipe, 201);
    } catch (err) {
        console.error(err);
        return c.json({ error: 'Failed to create recipe' }, 500);
    }
});

recipeRoutes.get('/recipes', async (c) => {
    try {
        const recipes = await recipeModel.findAll();

        if (!recipes) {
            return c.json({ error: "Recipe not found" },404);
        }
        return c.json(recipes, 200);
    } catch (err) {
        console.error(err);
        return c.json({ error: "Failed to fetch recipes" }, 500);
    }
});

recipeRoutes.get('/recipes/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const recipe = await recipeModel.findById(id);

        if (!recipe) {
            return c.json({ error: 'Recipe not found' }, 404);
        }
        return c.json(recipe, 200);
    } catch (err) {
        console.error(err);
        return c.json({ error: 'Failed to fetch recipe' }, 500);
    }
});

recipeRoutes.patch('/recipes/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json<Partial<Recipe>>();
        const updated = await recipeModel.update(id, body);

        if (!updated) {
            return c.json({ error: 'Recipe not found' }, 404);
        }
        return c.json(updated, 200);
    } catch (err) {
        console.error(err);
        return c.json({ error: 'Failed to update recipe' }, 500);
    }
});

recipeRoutes.delete('/recipes/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const deleted = await recipeModel.delete(id);

        if (!deleted) {
            return c.json({ error: 'Recipe not found'}, 404);
        }
        return c.status(204);
    } catch (err) {
        console.error(err);
        return c.json({ error: 'Failed to delete recipe' }, 500);
    }
});

export default recipeRoutes;
