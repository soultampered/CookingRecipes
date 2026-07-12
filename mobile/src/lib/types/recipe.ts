// Mirrors src/types/recipe.ts (ObjectId/Date fields become string over the wire)
import type { Unit } from './unit';

export interface RecipeIngredient {
	inventoryItemId: string;
	quantity: number;
	unit?: Unit;
}

export interface NutritionFacts {
	calories?: number;
	fat?: number;
	protein?: number;
	carbs?: number;
	[key: string]: number | undefined;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface Recipe {
	_id: string;
	title: string;
	description?: string;
	ingredients: RecipeIngredient[];
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

export type NewRecipe = Omit<Recipe, '_id' | 'createdAt' | 'updatedAt'>;

export interface MissingIngredient {
	name: string;
	needed: number;
	unit?: string;
}
