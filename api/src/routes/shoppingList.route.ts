import { Hono } from 'hono';
import { shoppingListService } from "../services/shoppingList.service.js"
import { shoppingListInventoryService } from "../services/shoppingListInventory.service.js"
import { priceHistoryService } from "../services/priceHistory.service.js";
import { shoppingPlanService } from "../services/shoppingPlan.service.js";
import { accessService } from "../services/access.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { featuresService } from "../services/features.service.js";
import { requireFeature } from "../middleware/requireFeature.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { validateJson } from "../middleware/validate.middleware.js";
import {
    createShoppingListSchema,
    updateShoppingListSchema,
    addShoppingListItemSchema,
    fromRecipesSchema
} from "../schemas/shoppingList.schema.js";

const shoppingListRoute = new Hono<{ Variables: AuthVariables }>();

shoppingListRoute.use('*', authMiddleware);
shoppingListRoute.use('*', requireVerified);

shoppingListRoute.get('/', async (c) => {
    try {
        const raw = c.req.query('household');
        const household = raw && /^[0-9a-fA-F]{24}$/.test(raw) ? raw : null;
        if (household && !(await accessService.isMember(c.get('userId'), household))) return c.json({ error: 'Forbidden' }, 403);
        const lists = await shoppingListService.getAllShoppingLists(c.get('userId'), household);
        return c.json(lists, 200);
    } catch {
        return c.json({ error: 'Failed to fetch shopping lists' }, 500);
    }
});

// Prices and budgets are ignored until the budget flag (2.3).
function withoutPrices<T extends { budget?: unknown; price?: unknown; items?: { price?: unknown }[] }>(body: T, userId: string): T {
    if (featuresService.isOn('budget', userId)) return body;
    const { budget, price, ...rest } = body;
    return { ...rest, ...(rest.items ? { items: rest.items.map(({ price, ...item }) => item) } : {}) } as T;
}

shoppingListRoute.post('/', validateJson(createShoppingListSchema), async (c) => {
    try {
        const body = withoutPrices(c.req.valid('json'), c.get('userId'));
        if (body.householdId && !(await accessService.isMember(c.get('userId'), body.householdId))) {
            return c.json({ error: 'Forbidden' }, 403);
        }
        const created = await shoppingListService.createShoppingList({
            ...body,
            userId: c.get('userId')
        });
        return c.json(created, 201);
    } catch (err) {
        if ((err as Error).message === 'INVALID_INPUT') {
            return c.json({ error: 'Name and items are required' }, 400);
        }
        return c.json({ error: 'Failed to create shopping list' }, 500);
    }
});

// Combined list across recipes; preview = no writes.
shoppingListRoute.post('/from-recipes/preview', requireFeature('mealPrep'), validateJson(fromRecipesSchema), async (c) => {
    try {
        const { recipes, householdId } = c.req.valid('json');
        return c.json(await shoppingPlanService.plan(c.get('userId'), recipes, householdId ?? null), 200);
    } catch (err) {
        if ((err as Error).message === 'UNKNOWN_RECIPE') return c.json({ error: 'Recipe not found' }, 404);
        if ((err as Error).message === 'FORBIDDEN') return c.json({ error: 'Forbidden' }, 403);
        return c.json({ error: 'Failed to build list' }, 500);
    }
});

shoppingListRoute.post('/from-recipes', requireFeature('mealPrep'), validateJson(fromRecipesSchema), async (c) => {
    try {
        const { recipes, name, listId, householdId } = c.req.valid('json');
        return c.json(await shoppingPlanService.createList(c.get('userId'), recipes, { name, listId, householdId }), 201);
    } catch (err) {
        const message = (err as Error).message;
        if (message === 'UNKNOWN_RECIPE') return c.json({ error: 'Recipe not found' }, 404);
        if (message === 'FORBIDDEN') return c.json({ error: 'Forbidden' }, 403);
        if (message === 'NOT_FOUND') return c.json({ error: 'Shopping list not found' }, 404);
        return c.json({ error: 'Failed to build list' }, 500);
    }
});

shoppingListRoute.get('/:id', async (c) => {
    try {
        const list = await shoppingListService.getShoppingListById(c.req.param('id'));
        if (!(await accessService.canAccess(c.get('userId'), list))) return c.json({ error: 'Forbidden' }, 403);
        return c.json(list, 200);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Shopping list not found' }, 404);
        }
        return c.json({ error: 'Failed to fetch shopping list' }, 500);
    }
});

shoppingListRoute.patch('/:id', validateJson(updateShoppingListSchema), async (c) => {
    try {
        const existing = await shoppingListService.getShoppingListById(c.req.param('id'));
        if (!(await accessService.canAccess(c.get('userId'), existing))) return c.json({ error: 'Forbidden' }, 403);
        const body = withoutPrices(c.req.valid('json'), c.get('userId'));
        if (body.householdId && !(await accessService.isMember(c.get('userId'), body.householdId))) {
            return c.json({ error: 'Forbidden' }, 403);
        }
        const updated = await shoppingListService.updateShoppingList(c.req.param('id'), body);
        return c.json(updated, 200);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Shopping list not found' }, 404);
        }
        if ((err as Error).message === 'LIST_CHANGED') {
            return c.json({ error: 'This list was changed elsewhere', code: 'LIST_CHANGED' }, 409);
        }
        return c.json({ error: 'Failed to update shopping list' }, 500);
    }
});

shoppingListRoute.delete('/:id', async (c) => {
    try {
        const existing = await shoppingListService.getShoppingListById(c.req.param('id'));
        if (!(await accessService.canAccess(c.get('userId'), existing))) return c.json({ error: 'Forbidden' }, 403);
        await shoppingListService.deleteShoppingList(c.req.param('id'));
        return c.body(null, 204);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Shopping list not found' }, 404);
        }
        return c.json({ error: 'Failed to delete shopping list' }, 500);
    }
});

shoppingListRoute.post('/:id/items', validateJson(addShoppingListItemSchema), async (c) => {
    try {
        const existing = await shoppingListService.getShoppingListById(c.req.param('id'));
        if (!(await accessService.canAccess(c.get('userId'), existing))) return c.json({ error: 'Forbidden' }, 403);
        const body = withoutPrices(c.req.valid('json'), c.get('userId'));
        const updated = await shoppingListService.addItem(c.req.param('id'), body);
        return c.json(updated, 201);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Shopping list not found' }, 404);
        }
        return c.json({ error: 'Failed to add item' }, 500);
    }
});

shoppingListRoute.delete('/:id/items/:itemId', async (c) => {
    try {
        const existing = await shoppingListService.getShoppingListById(c.req.param('id'));
        if (!(await accessService.canAccess(c.get('userId'), existing))) return c.json({ error: 'Forbidden' }, 403);
        const updated = await shoppingListService.removeItem(c.req.param('id'), c.req.param('itemId'));
        return c.json(updated, 200);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Shopping list not found' }, 404);
        }
        return c.json({ error: 'Failed to remove item' }, 500);
    }
});

shoppingListRoute.patch('/:id/items/:itemId', async (c) => {
    try {
        const existing = await shoppingListService.getShoppingListById(c.req.param('id'));
        if (!(await accessService.canAccess(c.get('userId'), existing))) return c.json({ error: 'Forbidden' }, 403);
        const updated = await shoppingListService.toggleItemChecked(c.req.param('id'), c.req.param('itemId'));

        const item = updated.items.find((i) => i._id?.toString() === c.req.param('itemId'));
        if (item?.checked && item.price != null && featuresService.isOn('priceWatch', c.get('userId'))) {
            await priceHistoryService.record(c.get('userId'), item.name, item.price, updated.store, `${c.req.param('id')}:${item._id}`);
        }
        if (item?.checked) {
            try {
                await shoppingListInventoryService.addCheckedItemToInventory(c.get('userId'), item, updated.householdId ?? null);
            } catch (err) {
                // Don't fail the checkbox toggle over the inventory side effect — the item is
                // already checked either way, and this is a convenience sync, not the source of truth.
                console.error('Failed to sync checked item to inventory:', err);
            }
        }

        return c.json(updated, 200);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Shopping list not found' }, 404);
        }
        return c.json({ error: 'Failed to update item' }, 500);
    }
});

export default shoppingListRoute;
