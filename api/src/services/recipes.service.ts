import { ObjectId } from 'mongodb';
import { recipeModel } from '../models/index.js';
import { recipeRevisionModel } from '../models/recipeRevision.model.js';
import { recipeCollectionModel } from '../models/recipeCollection.model.js';
import type { Recipe, NewRecipe } from '../types/recipe.js';
import { REVISION_FIELDS, type RecipeSnapshot, type RevisionField } from '../types/recipeRevision.js';

function snapshot(recipe: Recipe): RecipeSnapshot {
    const out: Partial<RecipeSnapshot> = {};
    for (const f of REVISION_FIELDS) (out as Record<string, unknown>)[f] = recipe[f];
    return out as RecipeSnapshot;
}

function changedFields(before: Recipe, patch: Partial<Recipe>): RevisionField[] {
    return REVISION_FIELDS.filter((f) => f in patch && JSON.stringify(patch[f]) !== JSON.stringify(before[f]));
}

export const recipeService = {
    async getAllRecipes(userId: string) {
        return recipeModel.findAll(userId);
    },

    async getRecipeById(id: string) {
        const recipe = await recipeModel.findById(id);
        if (!recipe) throw new Error('NOT_FOUND');
        return recipe;
    },

    async createRecipe(recipe: NewRecipe) {
        const newRecipe = await recipeModel.create(recipe);
        if (!newRecipe) throw new Error('Recipe not created');
        return newRecipe;
    },

    // STO-89: snapshots the pre-edit recipe when any content field actually changes.
    async updateRecipe(id: string, data: Partial<Recipe>, editNote?: string) {
        const before = await recipeModel.findById(id);
        const changed = changedFields(before, data);
        const updated = await recipeModel.update(id, data);
        if (!updated) throw new Error('Recipe not updated');
        if (changed.length) {
            await recipeRevisionModel.create({
                recipeId: id,
                userId: before.userId,
                before: snapshot(before),
                changed,
                note: editNote?.trim() || undefined,
                editedAt: new Date()
            });
        }
        return updated;
    },

    async listRevisions(id: string) {
        return recipeRevisionModel.findByRecipeId(id);
    },

    async restoreRevision(id: string, revisionId: string) {
        if (!ObjectId.isValid(revisionId)) throw new Error('NOT_FOUND');
        const revision = await recipeRevisionModel.findById(revisionId);
        if (!revision || revision.recipeId !== id) throw new Error('NOT_FOUND');
        const restoredFrom = revision.editedAt.toISOString().slice(0, 10);
        return this.updateRecipe(id, revision.before, `Restored version from ${restoredFrom}`);
    },

    async deleteRecipe(id: string) {
        const deleted = await recipeModel.delete(id);
        if (!deleted) throw new Error('Could not delete recipe');
        await recipeRevisionModel.deleteByRecipeId(id);
        await recipeCollectionModel.pullRecipeEverywhere(id);
        return true;
    },
};
