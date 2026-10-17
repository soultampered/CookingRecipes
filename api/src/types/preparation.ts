import type { ObjectId } from "mongodb";
import type { NutritionFacts } from "./recipe.js";

// STO-22: one row per successful prepare. Nutrition is snapshotted (per-serving ×
// servings made) so later recipe edits don't rewrite history.
export interface Preparation {
    _id?: ObjectId;
    userId: string;
    recipeId: string;
    recipeTitle: string;
    servings: number;
    nutrition: NutritionFacts;
    preparedAt: Date;
}
