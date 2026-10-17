import { recipeCollectionModel } from "../models/recipeCollection.model.js";
import { recipeService } from "./recipes.service.js";
import type { RecipeCollection } from "../types/recipeCollection.js";

// Throws NOT_FOUND / FORBIDDEN / UNKNOWN_RECIPE.
async function owned(id: string, userId: string): Promise<RecipeCollection> {
    const collection = await recipeCollectionModel.findById(id);
    if (!collection) throw new Error("NOT_FOUND");
    if (collection.userId !== userId) throw new Error("FORBIDDEN");
    return collection;
}

async function assertOwnsRecipes(recipeIds: string[], userId: string): Promise<void> {
    for (const id of recipeIds) {
        const recipe = await recipeService.getRecipeById(id).catch(() => null);
        if (!recipe || recipe.userId !== userId) throw new Error("UNKNOWN_RECIPE");
    }
}

export const recipeCollectionService = {
    list: (userId: string) => recipeCollectionModel.findAllByUserId(userId),

    create: (userId: string, name: string) => recipeCollectionModel.create({ userId, name, recipeIds: [] }),

    async update(id: string, userId: string, data: { name?: string; recipeIds?: string[] }) {
        await owned(id, userId);
        if (data.recipeIds) await assertOwnsRecipes(data.recipeIds, userId);
        return recipeCollectionModel.update(id, data);
    },

    async remove(id: string, userId: string) {
        await owned(id, userId);
        await recipeCollectionModel.delete(id);
    },

    async addRecipe(id: string, userId: string, recipeId: string) {
        await owned(id, userId);
        await assertOwnsRecipes([recipeId], userId);
        return recipeCollectionModel.addRecipe(id, recipeId);
    },

    async removeRecipe(id: string, userId: string, recipeId: string) {
        await owned(id, userId);
        return recipeCollectionModel.removeRecipe(id, recipeId);
    }
};
