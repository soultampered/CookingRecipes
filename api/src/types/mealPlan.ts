import type { ObjectId } from "mongodb";

// STO-9: one planned recipe on one (local) calendar day.
export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export interface MealPlanEntry {
    _id?: ObjectId;
    userId: string;
    date: string; // YYYY-MM-DD, the user's local day
    recipeId: string;
    slot?: MealSlot;
    servings?: number;
    createdAt?: Date;
}
