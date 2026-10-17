import { Hono } from "hono";
import { inventoryService } from "../services/inventory.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { validateJson } from "../middleware/validate.middleware.js";
import { createInventorySchema, updateInventorySchema, adjustInventorySchema } from "../schemas/inventory.schema.js";
import { InventoryAdjustError } from "../types/inventory.js";
import { restockService } from "../services/restock.service.js";
import { appliedAdjustmentModel } from "../models/appliedAdjustment.model.js";

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

// Items predicted to run out within ?days= (default 7, max 60).
inventoryRoutes.get('/restock', async (c) => {
    const days = Number(c.req.query('days') ?? 7);
    if (!Number.isFinite(days) || days < 1 || days > 60) return c.json({ error: 'days must be 1-60' }, 400);
    try {
        return c.json(await restockService.predict(c.get('userId'), days), 200);
    } catch {
        return c.json({ error: 'Failed to predict restock' }, 500);
    }
});

inventoryRoutes.post('/adjust', validateJson(adjustInventorySchema), async (c) => {
    const { adjustments, adjustmentId } = c.req.valid('json');
    if (adjustmentId && !(await appliedAdjustmentModel.claim(adjustmentId, c.get('userId')))) {
        return c.json(await inventoryService.getInventoryItemsByIds(adjustments.map((a) => a.id)), 200);
    }
    try {
        const items = await inventoryService.applyAdjustments(c.get('userId'), adjustments);
        return c.json(items, 200);
    } catch (err) {
        if (adjustmentId) await appliedAdjustmentModel.release(adjustmentId).catch(() => {});
        if (err instanceof InventoryAdjustError) {
            const status = err.message === 'FORBIDDEN' ? 403 : err.message === 'INGREDIENT_NOT_FOUND' ? 404 : 400;
            return c.json({ error: 'Could not adjust inventory', code: err.message, itemIds: err.itemIds }, status);
        }
        return c.json({ error: 'Failed to adjust inventory' }, 500);
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
