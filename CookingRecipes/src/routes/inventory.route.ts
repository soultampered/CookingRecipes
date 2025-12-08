import { Hono } from "hono";
import type { Inventory } from "../types/inventory.js";
import { inventoryService } from "../services/inventory.service.js";

const inventoryRoutes = new Hono();

inventoryRoutes.post('/inventory', async (c) => {
    try {
        const body = await c.req.json<Inventory>();
        const newInventory = await inventoryService.createInventory(body);
        return c.json(newInventory, 201);
    } catch (err) {
        if ((err as Error).message === 'DUPLICATE_NAME') {
            console.error(err);
            return c.json({ error: 'Inventory name already exists' }, 400);
        }
        return c.json({ error: 'Failed to create inventory' }, 500);
    }
});

inventoryRoutes.get('/inventory', async (c) => {
    const userId = c.req.query('userId');
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

inventoryRoutes.get('/inventory/:id', async (c) => {
    try {
        const item = await inventoryService.getInventoryById(c.req.param('id'));
        return c.json(item);
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({ error: 'Item not found' }, 404);
        }
        return c.json({ error: "Failed to get inventory" }, 500);
    }
});

inventoryRoutes.put('/inventory/:id', async (c) => {
    const data = await c.req.json<Partial<Inventory>>();
    try {
        const item = await inventoryService.updateInventory(c.req.param('id'), data);
        return c.json(item);
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({error: 'Item not found'}, 404);
        }
        return c.json({ error: "Failed to update inventory" }, 500);
    }
});

inventoryRoutes.delete('/inventory/:id', async (c) => {
    try {
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