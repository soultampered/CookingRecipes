import { z } from "zod";
import { MEAL_SLOTS } from "../types/mealPlan.js";

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

export const addMealPlanSchema = z.object({
    date: localDate,
    recipeId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    slot: z.enum(MEAL_SLOTS).optional(),
    servings: z.number().finite().positive().max(1000).optional()
});

export const updateMealPlanSchema = addMealPlanSchema.omit({ recipeId: true }).partial();

export const mealPlanRangeSchema = z.object({ from: localDate, to: localDate });

export const mealPlanShoppingListSchema = mealPlanRangeSchema.extend({
    name: z.string().trim().min(1).max(200).optional()
});
