import { mealPlanModel } from "../models/mealPlan.model.js";
import { recipeService } from "./recipes.service.js";
import type { MealPlanEntry, MealSlot } from "../types/mealPlan.js";

export interface MealPlanView extends MealPlanEntry {
    recipeTitle: string;
}

async function ownedEntry(id: string, userId: string): Promise<MealPlanEntry> {
    const entry = await mealPlanModel.findById(id);
    if (!entry) throw new Error("NOT_FOUND");
    if (entry.userId !== userId) throw new Error("FORBIDDEN");
    return entry;
}

async function assertOwnsRecipe(recipeId: string, userId: string) {
    const recipe = await recipeService.getRecipeById(recipeId).catch(() => null);
    if (!recipe || recipe.userId !== userId) throw new Error("UNKNOWN_RECIPE");
    return recipe;
}

export const mealPlanService = {
    async list(userId: string, from: string, to: string): Promise<MealPlanView[]> {
        const entries = await mealPlanModel.findRange(userId, from, to);
        const recipes = await recipeService.getAllRecipes(userId);
        const titles = new Map(recipes.map((r) => [r._id.toString(), r.title]));
        // Entries whose recipe was deleted are dropped.
        return entries
            .filter((e) => titles.has(e.recipeId))
            .map((e) => ({ ...e, recipeTitle: titles.get(e.recipeId)! }));
    },

    async add(userId: string, data: { date: string; recipeId: string; slot?: MealSlot; servings?: number }) {
        const recipe = await assertOwnsRecipe(data.recipeId, userId);
        const entry = await mealPlanModel.create({ userId, ...data });
        return { ...entry, recipeTitle: recipe.title };
    },

    async update(id: string, userId: string, data: { date?: string; slot?: MealSlot; servings?: number }) {
        await ownedEntry(id, userId);
        return mealPlanModel.update(id, data);
    },

    async remove(id: string, userId: string) {
        await ownedEntry(id, userId);
        await mealPlanModel.delete(id);
    }
};
