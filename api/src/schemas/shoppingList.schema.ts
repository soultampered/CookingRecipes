import { z } from "zod";
import { INVENTORY_CATEGORIES } from "../types/inventory.js";

const shoppingListItemSchema = z.object({
    name: z.string().trim().min(1).max(200),
    quantity: z.number().finite(),
    checked: z.boolean().optional(),
    category: z.enum(INVENTORY_CATEGORIES).optional()
});

// userId/_id are never client-set — createShoppingList always overrides userId from
// the authenticated session (see shoppingList.route.ts).
export const createShoppingListSchema = z.object({
    name: z.string().trim().min(1).max(200),
    items: z.array(shoppingListItemSchema)
});

export const updateShoppingListSchema = createShoppingListSchema.partial();

export const addShoppingListItemSchema = shoppingListItemSchema;
