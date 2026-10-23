import { recipeCollectionModel } from "../models/recipeCollection.model.js";
import { ObjectId } from "mongodb";
import { recipeModel } from "../models/recipe.model.js";
import type { RecipeCollection } from "../types/recipeCollection.js";

// Throws NOT_FOUND / FORBIDDEN / UNKNOWN_RECIPE.
async function owned(id: string, userId: string): Promise<RecipeCollection> {
    const collection = await recipeCollectionModel.findById(id);
    if (!collection) throw new Error("NOT_FOUND");
    if (collection.userId !== userId) throw new Error("FORBIDDEN");
    return collection;
}

// One query for the whole list (a collection can hold up to 1000 recipes).
async function assertOwnsRecipes(recipeIds: string[], userId: string): Promise<void> {
    const unique = [...new Set(recipeIds)];
    if (unique.some((id) => !ObjectId.isValid(id))) throw new Error("UNKNOWN_RECIPE");
    if ((await recipeModel.countOwned(unique, userId)) !== unique.length) throw new Error("UNKNOWN_RECIPE");
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
