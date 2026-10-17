import { z } from "zod";
import { INVENTORY_CATEGORIES } from "../types/inventory.js";
import { UNITS } from "../types/unit.js";

const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, "must be a valid id");

const shoppingListItemSchema = z.object({
    name: z.string().trim().min(1).max(200),
    quantity: z.number().finite(),
    checked: z.boolean().optional(),
    category: z.enum(INVENTORY_CATEGORIES).optional(),
    price: z.number().finite().nonnegative().max(100000).nullable().optional(),
    unit: z.enum(UNITS).optional()
});

// userId/_id are never client-set — createShoppingList always overrides userId from
// the authenticated session (see shoppingList.route.ts).
export const createShoppingListSchema = z.object({
    name: z.string().trim().min(1).max(200),
    items: z.array(shoppingListItemSchema)
});

// Keep item _ids on PATCH (zod used to strip them).
export const updateShoppingListSchema = createShoppingListSchema.partial().extend({
    items: z.array(shoppingListItemSchema.extend({ _id: objectIdString.optional() })).optional(),
    budget: z.number().finite().nonnegative().max(1000000).nullable().optional(),
    store: z.string().trim().max(80).nullable().optional(),
    // The list's updatedAt as the client last saw it.
    ifUpdatedAt: z.iso.datetime().optional()
});

export const addShoppingListItemSchema = shoppingListItemSchema;

export const fromRecipesSchema = z.object({
    recipes: z
        .array(z.object({ recipeId: objectIdString, scale: z.number().finite().positive().max(100).optional() }))
        .min(1)
        .max(50),
    name: z.string().trim().min(1).max(200).optional(),
    listId: objectIdString.optional()
});
