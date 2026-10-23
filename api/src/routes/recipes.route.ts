import { Hono } from 'hono';
import { recipeService } from "../services/recipes.service.js";
import { recipeInventoryService } from "../services/recipeInventory.service.js"
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { validateJson } from "../middleware/validate.middleware.js";
import { createRecipeSchema, updateRecipeSchema, prepareRecipeSchema } from "../schemas/recipe.schema.js";
import { InventoryAdjustError } from "../types/inventory.js";
import { featuresService } from "../services/features.service.js";

const recipeRoutes = new Hono<{ Variables: AuthVariables }>();

recipeRoutes.use('*', authMiddleware);
recipeRoutes.use('*', requireVerified);

// Fields of unreleased features are ignored.
function releasedFields<T extends Record<string, unknown>>(body: T, userId: string): T {
    const out: Record<string, unknown> = { ...body };
    if (!featuresService.isOn('ratings', userId)) {
        delete out.favorite;
        delete out.rating;
    }
    return out as T;
}

recipeRoutes.post('/', validateJson(createRecipeSchema), async (c) => {
    try {
        const body = releasedFields(c.req.valid('json'), c.get('userId'));
        const newRecipe = await recipeService.createRecipe({ ...body, userId: c.get('userId') });
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
        const recipes = await recipeService.getAllRecipes(c.get('userId'));
        return c.json(recipes, 200);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Recipe not found' }, 404);
        }
        return c.json({ error: "Failed to fetch recipes" }, 500);
    }
});

recipeRoutes.get('/suggestions', async (c) => {
    const suggestions = await recipeInventoryService.suggestRecipes(c.get('userId'));
    return c.json(suggestions);
});

recipeRoutes.get('/:id', async (c) => {
    try {
        const recipe = await recipeService.getRecipeById(c.req.param('id'));
        if (recipe.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
        return c.json(recipe, 200);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Recipe not found' }, 404);
        }
        return c.json({ error: 'Failed to fetch recipe' }, 500);
    }
});

recipeRoutes.patch('/:id', validateJson(updateRecipeSchema), async (c) => {
    try {
        const existing = await recipeService.getRecipeById(c.req.param('id'));
        if (existing.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
        const body = releasedFields(c.req.valid('json'), c.get('userId'));
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
        const existing = await recipeService.getRecipeById(c.req.param('id'));
        if (existing.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
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
    // Parsed by hand so an older build's bodyless POST still works.
    // Before saferPrepare: the old whole-recipe deduction.
    const raw = featuresService.isOn('saferPrepare', c.get('userId')) ? await c.req.json().catch(() => ({})) : {};
    const parsed = prepareRecipeSchema.safeParse(raw ?? {});
    if (!parsed.success) return c.json({ error: 'Invalid request body' }, 400);
    let existing;
    try {
        existing = await recipeService.getRecipeById(c.req.param('id'));
    } catch {
        return c.json({ error: 'Recipe not found', code: 'RECIPE_NOT_FOUND' }, 404);
    }
    if (existing.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
    try {
        const result = await recipeInventoryService.deductIngredients(c.req.param('id'), c.get('userId'), parsed.data);
        return c.json({ success: true, ...result });
    } catch (err) {
        if (err instanceof InventoryAdjustError) {
            if (err.message === 'INGREDIENT_NOT_FOUND') {
                return c.json({ error: 'An ingredient is no longer in your inventory', code: err.message, itemIds: err.itemIds }, 404);
            }
            if (err.message === 'INSUFFICIENT_STOCK') {
                return c.json({ error: 'Not enough stock to prepare this recipe', code: err.message, itemIds: err.itemIds }, 400);
            }
            return c.json({ error: 'Forbidden' }, 403);
        }
        console.error('Failed to prepare recipe:', err);
        return c.json({ error: 'Failed to prepare recipe' }, 500);
    }
});


recipeRoutes.get('/:id/missing-ingredients', async (c) => {
    try {
        const existing = await recipeService.getRecipeById(c.req.param('id'));
        if (existing.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
        const missing = await recipeInventoryService.getMissingIngredients(c.req.param('id'));
        return c.json(missing);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Recipe not found' }, 404);
        }
        console.error('Failed to get missing ingredients:', err);
        return c.json({ error: 'Failed to get missing ingredients' }, 500);
    }
});

export default recipeRoutes;