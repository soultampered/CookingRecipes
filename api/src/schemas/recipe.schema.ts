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
    difficulty: z.enum(["easy", "medium", "hard"])
});

export const updateRecipeSchema = createRecipeSchema.partial();
