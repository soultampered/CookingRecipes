import { Hono } from 'hono';
import { recipeService } from "../services/recipes.service.js";
import { recipeInventoryService } from "../services/recipeInventory.service.js"
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { validateJson } from "../middleware/validate.middleware.js";
import { createRecipeSchema, updateRecipeSchema, prepareRecipeSchema, importRecipeSchema } from "../schemas/recipe.schema.js";
import { recipeImportService } from "../services/recipeImport.service.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";

const importLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, prefix: "recipe-import" });
import { InventoryAdjustError } from "../types/inventory.js";
import { featuresService } from "../services/features.service.js";
import { requireFeature } from "../middleware/requireFeature.middleware.js";
import { recipeShareService } from "../services/recipeShare.service.js";
import { photoService } from "../services/photo.service.js";
import { accessService } from "../services/access.service.js";
import { inventoryModel } from "../models/inventory.model.js";

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
    if (!featuresService.isOn('photos', userId)) delete out.photoId;
    return out as T;
}

recipeRoutes.post('/', validateJson(createRecipeSchema), async (c) => {
    try {
        const body = releasedFields(c.req.valid('json'), c.get('userId'));
        if (body.photoId) await photoService.assertOwned(body.photoId, c.get('userId'));
        const newRecipe = await recipeService.createRecipe({ ...body, userId: c.get('userId') });
        return c.json(newRecipe, 201);
    } catch (err) {
        if ((err as Error).message === 'UNKNOWN_PHOTO') return c.json({ error: 'Photo not found' }, 400);
        if ((err as Error).message === 'DUPLICATE_NAME') {
            console.error(err);
            return c.json({ error: 'Recipe name already exists' }, 400);
        }
        return c.json({ error: 'Failed to create recipe' }, 500);
    }
});

recipeRoutes.post('/import', requireFeature('recipeImport'), importLimiter, validateJson(importRecipeSchema), async (c) => {
    try {
        return c.json(await recipeImportService.importFromUrl(c.get('userId'), c.req.valid('json').url), 201);
    } catch (err) {
        const message = (err as Error).message;
        if (message === 'BAD_URL') return c.json({ error: "That link can't be imported" }, 400);
        if (message === 'NO_RECIPE') return c.json({ error: 'No recipe found on that page' }, 422);
        if (message === 'TOO_LARGE') return c.json({ error: 'That page is too large to import' }, 422);
        if (message === 'FETCH_FAILED' || (err as Error).name === 'TimeoutError') {
            return c.json({ error: "Couldn't load that page" }, 502);
        }
        console.error('Recipe import failed:', err);
        return c.json({ error: 'Failed to import recipe' }, 500);
    }
});

recipeRoutes.get('/', async (c) => {
    try {
        const userId = c.get('userId');
        const recipes = await recipeService.getAccessibleRecipes(userId);
        // A member sees a shared recipe, not its owner's public link.
        return c.json(recipes.map((r) => (r.userId === userId ? r : { ...r, shareToken: undefined })), 200);
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
        if (!(await accessService.canAccess(c.get('userId'), recipe))) return c.json({ error: 'Forbidden' }, 403);
        if (recipe.userId === c.get('userId')) return c.json(recipe, 200);
        // Members get ingredient names, not the owner's inventory.
        const items = await inventoryModel.findByIds(
            recipe.ingredients.map((i) => i.inventoryItemId).filter((id) => /^[0-9a-f]{24}$/i.test(id))
        );
        const ingredientNames = Object.fromEntries(items.map((i) => [i._id.toString(), i.name]));
        return c.json({ ...recipe, shareToken: undefined, ingredientNames }, 200);
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
        const { editNote, ...rest } = c.req.valid('json');
        const body = releasedFields(rest, c.get('userId'));
        if (body.photoId && body.photoId !== existing.photoId) await photoService.assertOwned(body.photoId, c.get('userId'));
        if (body.householdId && !(await accessService.isMember(c.get('userId'), body.householdId))) {
            return c.json({ error: 'Forbidden' }, 403);
        }
        const updated = await recipeService.updateRecipe(c.req.param('id'), body, editNote);
        if ('photoId' in body && existing.photoId && existing.photoId !== body.photoId) await photoService.remove(existing.photoId);
        return c.json(updated, 200);
    } catch (err) {
        if ((err as Error).message === 'UNKNOWN_PHOTO') return c.json({ error: 'Photo not found' }, 400);
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
        await photoService.remove(existing.photoId);
        return c.body(null, 204); // No content
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Recipe not found' }, 404);
        }
        return c.json({ error: 'Failed to delete recipe' }, 500);
    }
});

// PUBLIC_BASE_URL allows a custom domain later.
recipeRoutes.post('/:id/share', requireFeature('shareLinks'), async (c) => {
    try {
        const recipe = await recipeService.getRecipeById(c.req.param('id'));
        if (recipe.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
        const token = await recipeShareService.enable(recipe);
        const base = process.env.PUBLIC_BASE_URL ?? new URL(c.req.url).origin;
        return c.json({ token, url: `${base}/r/${token}` }, 200);
    } catch {
        return c.json({ error: 'Recipe not found' }, 404);
    }
});

// Unsharing works even with the flag off.
recipeRoutes.delete('/:id/share', async (c) => {
    try {
        const recipe = await recipeService.getRecipeById(c.req.param('id'));
        if (recipe.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
        await recipeShareService.disable(recipe);
        return c.body(null, 204);
    } catch {
        return c.json({ error: 'Recipe not found' }, 404);
    }
});

recipeRoutes.get('/:id/revisions', requireFeature('versionHistory'), async (c) => {
    try {
        const existing = await recipeService.getRecipeById(c.req.param('id'));
        if (!(await accessService.canAccess(c.get('userId'), existing))) return c.json({ error: 'Forbidden' }, 403);
        return c.json(await recipeService.listRevisions(c.req.param('id')), 200);
    } catch {
        return c.json({ error: 'Recipe not found' }, 404);
    }
});

recipeRoutes.post('/:id/revisions/:revisionId/restore', requireFeature('versionHistory'), async (c) => {
    try {
        const existing = await recipeService.getRecipeById(c.req.param('id'));
        if (existing.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
        const restored = await recipeService.restoreRevision(c.req.param('id'), c.req.param('revisionId'));
        return c.json(restored, 200);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') return c.json({ error: 'Version not found' }, 404);
        return c.json({ error: 'Failed to restore version' }, 500);
    }
});

recipeRoutes.post('/:id/prepare', async (c) => {
    // Parsed by hand so an older build's bodyless POST still works.
    // Before saferPrepare: the old whole-recipe deduction.
    const raw = featuresService.isOn('saferPrepare', c.get('userId')) ? await c.req.json().catch(() => ({})) : {};
    const parsed = prepareRecipeSchema.safeParse(raw ?? {});
    if (!parsed.success) return c.json({ error: 'Invalid request body' }, 400);
    if (!featuresService.isOn('leftovers', c.get('userId'))) delete parsed.data.leftovers;
    let existing;
    try {
        existing = await recipeService.getRecipeById(c.req.param('id'));
    } catch {
        return c.json({ error: 'Recipe not found', code: 'RECIPE_NOT_FOUND' }, 404);
    }
    if (!(await accessService.canAccess(c.get('userId'), existing))) return c.json({ error: 'Forbidden' }, 403);
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
            return c.json({ error: "Some ingredients are in a kitchen you don't share", code: err.message, itemIds: err.itemIds }, 403);
        }
        console.error('Failed to prepare recipe:', err);
        return c.json({ error: 'Failed to prepare recipe' }, 500);
    }
});


recipeRoutes.get('/:id/missing-ingredients', async (c) => {
    try {
        const existing = await recipeService.getRecipeById(c.req.param('id'));
        // Owner-only: it reads the owner's stock.
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