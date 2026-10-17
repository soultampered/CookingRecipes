import { mealPlanModel } from "../models/mealPlan.model.js";
import { recipeService } from "./recipes.service.js";
import type { MealPlanEntry, MealSlot } from "../types/mealPlan.js";
import { shoppingPlanService, type RecipeRequest } from "./shoppingPlan.service.js";

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

    // STO-87: entry.servings over recipe.servings sets the scale; repeats of a recipe add up.
    async recipeRequests(userId: string, from: string, to: string): Promise<RecipeRequest[]> {
        const entries = await mealPlanModel.findRange(userId, from, to);
        const recipes = await recipeService.getAllRecipes(userId);
        const byId = new Map(recipes.map((r) => [r._id.toString(), r]));
        const scales = new Map<string, number>();
        for (const e of entries) {
            const recipe = byId.get(e.recipeId);
            if (!recipe) continue;
            const scale = e.servings && recipe.servings ? e.servings / recipe.servings : 1;
            scales.set(e.recipeId, (scales.get(e.recipeId) ?? 0) + scale);
        }
        return [...scales].map(([recipeId, scale]) => ({ recipeId, scale }));
    },

    async buildShoppingList(userId: string, from: string, to: string, name?: string) {
        const requests = await this.recipeRequests(userId, from, to);
        if (!requests.length) throw new Error("EMPTY_PLAN");
        return shoppingPlanService.createList(userId, requests, { name: name ?? `Meal plan ${from}` });
    },

    async remove(id: string, userId: string) {
        await ownedEntry(id, userId);
        await mealPlanModel.delete(id);
    }
};
