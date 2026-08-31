import { z } from "zod";
import { UNITS } from "../types/unit.js";
import { INVENTORY_CATEGORIES } from "../types/inventory.js";

// userId/_id are never client-set — createInventory always overrides userId from the
// authenticated session (see inventory.route.ts), so they're excluded here too.
export const createInventorySchema = z.object({
    name: z.string().trim().min(1).max(200),
    quantity: z.number().finite(),
    unit: z.enum(UNITS),
    expirationDte: z.coerce.date().optional(),
    category: z.enum(INVENTORY_CATEGORIES).optional(),
    notes: z.string().trim().max(1000).optional(),
    lowStockThreshold: z.number().finite().optional()
});

export const updateInventorySchema = createInventorySchema.partial();
