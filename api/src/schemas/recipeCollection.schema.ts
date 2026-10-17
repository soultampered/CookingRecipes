import { z } from "zod";

const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, "must be a valid id");

export const createRecipeCollectionSchema = z.object({
    name: z.string().trim().min(1).max(80)
});

export const updateRecipeCollectionSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    recipeIds: z.array(objectIdString).max(1000).optional()
});

export const collectionRecipeSchema = z.object({
    recipeId: objectIdString
});
