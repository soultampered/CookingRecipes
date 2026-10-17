import type {ObjectId} from "mongodb";
import type { Unit } from  "./unit.js"

export interface RecipeIngredient {
    // Never actually stored/read as a real ObjectId anywhere (recipeInventory.service.ts
    // only ever calls .toString() on it) — it's the inventory item's id as a plain hex
    // string, same as every other id that crosses the JSON boundary.
    inventoryItemId: string;
    quantity: number;
    unit?: Unit;
}

export interface NutritionFacts {
    calories?: number;
    fat?: number;
    protein?: number;
    carbs?: number;
    [key: string]: number | undefined // to add micronutrients
}

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface Recipe {
    _id: ObjectId;
    userId: string;
    title: string;
    description?: string;
    ingredients: RecipeIngredient[];
    instructions: string[];
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    totalTimeMinutes?: number;
    servings?: number;
    tags?: string[];
    createdAt?: Date;
    updatedAt?: Date;
    author: string;
    nutrition: NutritionFacts[];
    difficulty: DifficultyLevel;
    // STO-24: feed Suggestions ordering. rating null = cleared.
    favorite?: boolean;
    rating?: number | null;
    // STO-84: unguessable public link token; absent = private.
    shareToken?: string | null;
    photoId?: string | null; // STO-19
}

export interface MissingIngredient {
    name: string;
    needed: number;
    unit?: string;
}

export type NewRecipe = Omit<Recipe, "_id" | "createdAt" | "updatedAt">;