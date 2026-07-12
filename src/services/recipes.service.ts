import { recipeModel } from '../models/index.js';
import type { Recipe } from '../types/recipe.js';

export const recipeService = {
    async getAllRecipes() {
        return recipeModel.findAll();
    },

    async getRecipeById(id: string) {
        const recipe = await recipeModel.findById(id);
        if (!recipe) throw new Error('NOT_FOUND');
        return recipe;
    },

    async createRecipe(recipe: Recipe) {
        const newRecipe = await recipeModel.create(recipe);
        if (!newRecipe) throw new Error('Recipe not created');
        return newRecipe;
    },

    async updateRecipe(id: string, data: Partial<Recipe>) {
        const updated = await recipeModel.update(id, data);
        if (!updated) throw new Error('Recipe not updated');
        return updated;
    },

    async deleteRecipe(id: string) {
        const deleted = await recipeModel.delete(id);
        if (!deleted) throw new Error('Could not delete recipe');
        return true;
    },
};
