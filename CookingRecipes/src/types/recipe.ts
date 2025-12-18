import type {ObjectId} from "mongodb";

export interface Ingredient {
    _id: ObjectId;
    name: string;
    quantity: number;
    unit?: string;
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
    ingredients: Ingredient[];
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