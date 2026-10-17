import type { ObjectId } from "mongodb";
import type { NutritionFacts } from "./recipe.js";

// One row per prepare. Nutrition is snapshotted so later edits don't rewrite history.
export interface Preparation {
    _id?: ObjectId;
    userId: string;
    recipeId: string;
    recipeTitle: string;
    servings: number;
    nutrition: NutritionFacts;
    preparedAt: Date;
}
