import { Hono } from "hono";
import { inventoryService } from "../services/inventory.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { validateJson } from "../middleware/validate.middleware.js";
import { createInventorySchema, updateInventorySchema } from "../schemas/inventory.schema.js";

const inventoryRoutes = new Hono<{ Variables: AuthVariables }>();

inventoryRoutes.use('*', authMiddleware);
inventoryRoutes.use('*', requireVerified);

inventoryRoutes.post('/', validateJson(createInventorySchema), async (c) => {
    try {
        const body = c.req.valid('json');
        const newInventory = await inventoryService.createInventory({ ...body, userId: c.get('userId') });
        return c.json(newInventory, 201);
    } catch (err) {
        if ((err as Error).message === 'DUPLICATE_NAME') {
            console.error(err);
            return c.json({ error: 'Inventory name already exists' }, 400);
        }
        return c.json({ error: 'Failed to create inventory' }, 500);
    }
});

inventoryRoutes.get('/', async (c) => {
    const userId = c.get('userId');
    const category = c.req.query('category');
    try {
        const items = await inventoryService.getAllInventory(userId, category);
        return c.json(items, 200);
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({ error: "Inventory not found" }, 404);
        }
        return c.json({ error: "Failed to fetch inventory" }, 500);
    }
});

inventoryRoutes.get('/:id', async (c) => {
    try {
        const item = await inventoryService.getInventoryById(c.req.param('id'));
        if (item.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
        return c.json(item);
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({ error: 'Item not found' }, 404);
        }
        return c.json({ error: "Failed to get inventory" }, 500);
    }
});

inventoryRoutes.put('/:id', validateJson(updateInventorySchema), async (c) => {
    try {
        const existing = await inventoryService.getInventoryById(c.req.param('id'));
        if (existing.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
        const data = c.req.valid('json');
        const item = await inventoryService.updateInventory(c.req.param('id'), data);
        return c.json(item);
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({error: 'Item not found'}, 404);
        }
        return c.json({ error: "Failed to update inventory" }, 500);
    }
});

inventoryRoutes.delete('/:id', async (c) => {
    try {
        const existing = await inventoryService.getInventoryById(c.req.param('id'));
        if (existing.userId !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
        await inventoryService.deleteInventory(c.req.param('id'));
        return c.json({ success: true });
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({ error: 'Item not found' }, 404);
        }
        return c.json({ error: "Failed to delete inventory" }, 500);
    }
});

export default inventoryRoutes;
