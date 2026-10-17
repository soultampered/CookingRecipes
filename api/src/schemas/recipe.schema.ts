import { z } from "zod";
import { UNITS } from "../types/unit.js";

const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, "must be a valid id");

const recipeIngredientSchema = z.object({
    inventoryItemId: objectIdString,
    quantity: z.number().finite(),
    unit: z.enum(UNITS).optional()
});

// nutrition entries are an open bag of numeric micronutrients (see NutritionFacts'
// index signature) alongside a few named macros — z.record covers both.
const nutritionFactsSchema = z.record(z.string(), z.number().finite().optional());

// userId/_id are never client-set — createRecipe always overrides userId from the
// authenticated session (see recipes.route.ts).
export const createRecipeSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    ingredients: z.array(recipeIngredientSchema),
    instructions: z.array(z.string().trim().min(1).max(2000)),
    prepTimeMinutes: z.number().finite().nonnegative().optional(),
    cookTimeMinutes: z.number().finite().nonnegative().optional(),
    totalTimeMinutes: z.number().finite().nonnegative().optional(),
    servings: z.number().finite().positive().optional(),
    tags: z.array(z.string().trim().max(64)).max(50).optional(),
    author: z.string().trim().min(1).max(200),
    nutrition: z.array(nutritionFactsSchema),
    difficulty: z.enum(["easy", "medium", "hard"]),
    favorite: z.boolean().optional(),
    photoId: z.string().regex(/^[0-9a-f]{32}$/).nullable().optional(),
    rating: z.number().int().min(1).max(5).nullable().optional()
});

// editNote (STO-89) is stored on the revision, never on the recipe.
export const updateRecipeSchema = createRecipeSchema.partial().extend({
    editNote: z.string().trim().max(500).optional()
});

// STO-17
export const importRecipeSchema = z.object({
    url: z.string().trim().url().max(2048)
});

// STO-20/117. Whole body optional — older app builds POST with no body.
export const prepareRecipeSchema = z.object({
    scale: z.number().finite().positive().max(100).optional(),
    overrides: z
        .array(z.object({ inventoryItemId: objectIdString, quantity: z.number().finite().nonnegative() }))
        .max(200)
        .optional(),
    // STO-86: turn part of the batch into a tracked inventory item.
    leftovers: z
        .object({
            servings: z.number().finite().positive().max(1000),
            expiresInDays: z.number().int().min(0).max(60)
        })
        .optional()
});
