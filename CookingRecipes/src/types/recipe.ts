import type {ObjectId} from "mongodb";
import type { Unit } from  "./unit.js"

export interface RecipeIngredient {
    inventoryItemId: ObjectId;
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
}

export interface MissingIngredient {
    name: string;
    needed: number;
    unit?: string;
}