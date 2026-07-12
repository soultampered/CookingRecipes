import { Hono } from 'hono';
import type { Recipe } from "../types/recipe.js";
import { recipeService } from "../services/recipes.service.js";
import { recipeInventoryService } from "../services/recipeInventory.service.js"

const recipeRoutes = new Hono();

recipeRoutes.post('/', async (c) => {
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

recipeRoutes.get('/', async (c) => {
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

recipeRoutes.get('/:id', async (c) => {
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

recipeRoutes.patch('/:id', async (c) => {
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

recipeRoutes.delete('/:id', async (c) => {
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

recipeRoutes.post('/:id/prepare', async (c) => {
    try {
        const result = await recipeInventoryService.deductIngredients(c.req.param('id'));
        return c.json({ success: true, updatedInventory: result });
    } catch (err) {
        return c.json({ error: (err as Error).message }, 400);
    }
});


recipeRoutes.get('/:id/missing-ingredients', async (c) => {
    try {
        const missing = await recipeInventoryService.getMissingIngredients(c.req.param('id'));
        return c.json(missing);
    } catch (err) {
        return c.json({ error: (err as Error).message }, 400);
    }
});

recipeRoutes.get('/suggestions', async (c) => {
    const suggestions = await recipeInventoryService.suggestRecipes();
    return c.json(suggestions);
});

export default recipeRoutes;