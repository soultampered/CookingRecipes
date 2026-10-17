import { Hono } from "hono";
import { inventoryService } from "../services/inventory.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { validateJson } from "../middleware/validate.middleware.js";
import { createInventorySchema, updateInventorySchema, adjustInventorySchema } from "../schemas/inventory.schema.js";
import { InventoryAdjustError } from "../types/inventory.js";
import { restockService } from "../services/restock.service.js";
import { photoService } from "../services/photo.service.js";
import { accessService } from "../services/access.service.js";
import { inventoryModel } from "../models/inventory.model.js";

// STO-88: ?household=<id> picks a household pantry; absent = personal.
function pantryParam(value: string | undefined): string | null {
    return value && /^[0-9a-fA-F]{24}$/.test(value) ? value : null;
}

const inventoryRoutes = new Hono<{ Variables: AuthVariables }>();

inventoryRoutes.use('*', authMiddleware);
inventoryRoutes.use('*', requireVerified);

inventoryRoutes.post('/', validateJson(createInventorySchema), async (c) => {
    try {
        const body = c.req.valid('json');
        if (body.photoId) await photoService.assertOwned(body.photoId, c.get('userId'));
        if (body.householdId && !(await accessService.isMember(c.get('userId'), body.householdId))) {
            return c.json({ error: 'Forbidden' }, 403);
        }
        const newInventory = await inventoryService.createInventory({ ...body, userId: c.get('userId') });
        return c.json(newInventory, 201);
    } catch (err) {
        if ((err as Error).message === 'UNKNOWN_PHOTO') return c.json({ error: 'Photo not found' }, 400);
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
    const expiringRaw = c.req.query('expiringWithinDays');
    const expiringWithinDays = expiringRaw === undefined ? undefined : Number(expiringRaw);
    if (expiringWithinDays !== undefined && (!Number.isInteger(expiringWithinDays) || expiringWithinDays < 0 || expiringWithinDays > 365)) {
        return c.json({ error: 'expiringWithinDays must be an integer 0-365' }, 400);
    }
    try {
        // ?household=all → every pantry the user can reach (recipe ingredient picker).
        if (c.req.query('household') === 'all') {
            return c.json(await inventoryModel.findAccessible(userId, await accessService.householdIdsFor(userId)), 200);
        }
        const household = pantryParam(c.req.query('household'));
        if (household && !(await accessService.isMember(userId, household))) return c.json({ error: 'Forbidden' }, 403);
        const items = await inventoryService.getAllInventory(userId, category, expiringWithinDays, household);
        return c.json(items, 200);
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({ error: "Inventory not found" }, 404);
        }
        return c.json({ error: "Failed to fetch inventory" }, 500);
    }
});

// STO-93: items predicted to run out within ?days= (default 7, max 60).
inventoryRoutes.get('/restock', async (c) => {
    const days = Number(c.req.query('days') ?? 7);
    if (!Number.isFinite(days) || days < 1 || days > 60) return c.json({ error: 'days must be 1-60' }, 400);
    try {
        const household = pantryParam(c.req.query('household'));
        if (household && !(await accessService.isMember(c.get('userId'), household))) return c.json({ error: 'Forbidden' }, 403);
        return c.json(await restockService.predict(c.get('userId'), days, household), 200);
    } catch {
        return c.json({ error: 'Failed to predict restock' }, 500);
    }
});

inventoryRoutes.post('/adjust', validateJson(adjustInventorySchema), async (c) => {
    try {
        const items = await inventoryService.applyAdjustments(c.get('userId'), c.req.valid('json').adjustments);
        return c.json(items, 200);
    } catch (err) {
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
        if (!(await accessService.canAccess(c.get('userId'), item))) return c.json({ error: 'Forbidden' }, 403);
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
        if (!(await accessService.canAccess(c.get('userId'), existing))) return c.json({ error: 'Forbidden' }, 403);
        const data = c.req.valid('json');
        if (data.photoId) await photoService.assertOwned(data.photoId, c.get('userId'));
        // Moving between pantries needs membership of the destination too.
        if (data.householdId && !(await accessService.isMember(c.get('userId'), data.householdId))) {
            return c.json({ error: 'Forbidden' }, 403);
        }
        const item = await inventoryService.updateInventory(c.req.param('id'), data);
        if ('photoId' in data && existing.photoId && existing.photoId !== data.photoId) await photoService.remove(existing.photoId);
        return c.json(item);
    } catch (err) {
        if ((err as Error).message === 'UNKNOWN_PHOTO') return c.json({ error: 'Photo not found' }, 400);
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({error: 'Item not found'}, 404);
        }
        return c.json({ error: "Failed to update inventory" }, 500);
    }
});

inventoryRoutes.delete('/:id', async (c) => {
    try {
        const existing = await inventoryService.getInventoryById(c.req.param('id'));
        if (!(await accessService.canAccess(c.get('userId'), existing))) return c.json({ error: 'Forbidden' }, 403);
        await inventoryService.deleteInventory(c.req.param('id'));
        await photoService.remove(existing.photoId);
        return c.json({ success: true });
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({ error: 'Item not found' }, 404);
        }
        return c.json({ error: "Failed to delete inventory" }, 500);
    }
});

export default inventoryRoutes;
