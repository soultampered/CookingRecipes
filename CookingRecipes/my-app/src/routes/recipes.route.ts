
import { Hono } from 'hono';
import type {Recipe} from "../types/recipe.js";
import { recipeService } from '../services/recipes.service.js';

const recipeRoutes = new Hono();

recipeRoutes.post('/recipes', async (c) => {
    try {
        const body = await c.req.json<Recipe>();
        const newRecipe = await recipeService.createRecipe(body);
        return c.json(newRecipe, 201);
    } catch (err) {
        if ((err as Error).message === 'DUPLICATE_NAME') {
            console.error(err);
            return c.json({ error: 'Recipe name already exists' }, 400);
        }
        return c.json({ error: 'Failed to create recipe' }, 500);
    }
});

recipeRoutes.get('/recipes', async (c) => {
    try {
        const recipes = await recipeService.getAllRecipes();
        return c.json(recipes, 200);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Recipe not found' }, 404);
        }
        return c.json({ error: "Failed to fetch recipes" }, 500);
    }
});

recipeRoutes.get('/recipes/:id', async (c) => {
    try {
        const recipe = await recipeService.getRecipeById(c.req.param('id'));
        return c.json(recipe, 200);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Recipe not found' }, 404);
        }
        return c.json({ error: 'Failed to fetch recipe' }, 500);
    }
});

recipeRoutes.patch('/recipes/:id', async (c) => {
    try {
        const body = await c.req.json<Partial<Recipe>>();
        const updated = await recipeService.updateRecipe(c.req.param('id'), body);
        return c.json(updated, 200);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Recipe not found' }, 404);
        }
        return c.json({ error: 'Failed to update recipe' }, 500);
    }
});

recipeRoutes.delete('/recipes/:id', async (c) => {
    try {
        await recipeService.deleteRecipe(c.req.param('id'));
        return c.body(null, 204); // No content
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Recipe not found' }, 404);
        }
        return c.json({ error: 'Failed to delete recipe' }, 500);
    }
});

export default recipeRoutes;