export interface Ingredient {
    name: string;
    quantity: number | string;
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
    _id?: string;
    title: string;
    description?: string;
    ingredients: Ingredient[];
    instructions: string[];
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    totalTimeMinutes?: number;
    servings?: number;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
    author: string;
    nutrition: NutritionFacts[];
    difficulty: DifficultyLevel;
}