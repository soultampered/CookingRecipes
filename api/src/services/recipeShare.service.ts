import crypto from "crypto";
import { recipeModel } from "../models/recipe.model.js";
import { inventoryModel } from "../models/inventory.model.js";
import type { Recipe } from "../types/recipe.js";

// The public view never exposes userId, inventory ids or stock.
export interface PublicRecipe {
    title: string;
    description?: string;
    author: string;
    servings?: number;
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    totalTimeMinutes?: number;
    difficulty: Recipe["difficulty"];
    tags?: string[];
    ingredients: { name: string; quantity: number; unit?: string }[];
    instructions: string[];
    nutritionPerServing?: Recipe["nutrition"][number];
}

export const recipeShareService = {
    async enable(recipe: Recipe): Promise<string> {
        if (recipe.shareToken) return recipe.shareToken;
        const token = crypto.randomBytes(18).toString("base64url");
        await recipeModel.update(recipe._id.toString(), { shareToken: token });
        return token;
    },

    async disable(recipe: Recipe): Promise<void> {
        await recipeModel.update(recipe._id.toString(), { shareToken: null });
    },

    async getPublic(token: string): Promise<PublicRecipe | null> {
        const recipe = await recipeModel.findByShareToken(token);
        if (!recipe) return null;
        const ids = [...new Set(recipe.ingredients.map((i) => i.inventoryItemId))].filter((id) => /^[0-9a-f]{24}$/i.test(id));
        const items = await inventoryModel.findByIds(ids);
        const names = new Map(items.map((i) => [i._id.toString(), { name: i.name, unit: i.unit }]));
        return {
            title: recipe.title,
            description: recipe.description,
            author: recipe.author,
            servings: recipe.servings,
            prepTimeMinutes: recipe.prepTimeMinutes,
            cookTimeMinutes: recipe.cookTimeMinutes,
            totalTimeMinutes: recipe.totalTimeMinutes,
            difficulty: recipe.difficulty,
            tags: recipe.tags,
            ingredients: recipe.ingredients.map((i) => ({
                name: names.get(i.inventoryItemId)?.name ?? "Ingredient",
                quantity: i.quantity,
                unit: i.unit ?? names.get(i.inventoryItemId)?.unit
            })),
            instructions: recipe.instructions,
            nutritionPerServing: recipe.nutrition?.[0]
        };
    }
};
