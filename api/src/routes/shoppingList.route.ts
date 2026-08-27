import { Hono } from 'hono';
import { shoppingListService } from "../services/shoppingList.service.js"
import { shoppingListInventoryService } from "../services/shoppingListInventory.service.js"
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { validateJson } from "../middleware/validate.middleware.js";
import {
    createShoppingListSchema,
    updateShoppingListSchema,
    addShoppingListItemSchema
} from "../schemas/shoppingList.schema.js";

const shoppingListRoute = new Hono<{ Variables: AuthVariables }>();

shoppingListRoute.use('*', authMiddleware);
shoppingListRoute.use('*', requireVerified);

shoppingListRoute.get('/', async (c) => {
    try {
        const lists = await shoppingListService.getAllShoppingLists(c.get('userId'));
        return c.json(lists, 200);
    } catch {
        return c.json({ error: 'Failed to fetch shopping lists' }, 500);
    }
});

shoppingListRoute.post('/', validateJson(createShoppingListSchema), async (c) => {
    try {
        const body = c.req.valid('json');
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

shoppingListRoute.get('/:id', async (c) => {
    try {
        const list = await shoppingListService.getShoppingListById(c.req.param('id'));
        if (list.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
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
        if (existing.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
        const body = c.req.valid('json');
        const updated = await shoppingListService.updateShoppingList(c.req.param('id'), body);
        return c.json(updated, 200);
    } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
            return c.json({ error: 'Shopping list not found' }, 404);
        }
        return c.json({ error: 'Failed to update shopping list' }, 500);
    }
});

shoppingListRoute.delete('/:id', async (c) => {
    try {
        const existing = await shoppingListService.getShoppingListById(c.req.param('id'));
        if (existing.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
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
        if (existing.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
        const body = c.req.valid('json');
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
        if (existing.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
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
        if (existing.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
        const updated = await shoppingListService.toggleItemChecked(c.req.param('id'), c.req.param('itemId'));

        const item = updated.items.find((i) => i._id?.toString() === c.req.param('itemId'));
        if (item?.checked) {
            try {
                await shoppingListInventoryService.addCheckedItemToInventory(c.get('userId'), item);
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
