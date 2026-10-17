import type { ObjectId } from "mongodb";
import type { Recipe } from "./recipe.js";

// STO-89: content fields that make a "version". favorite/rating aren't content.
export const REVISION_FIELDS = [
    "title",
    "description",
    "ingredients",
    "instructions",
    "prepTimeMinutes",
    "cookTimeMinutes",
    "totalTimeMinutes",
    "servings",
    "tags",
    "author",
    "nutrition",
    "difficulty"
] as const;
export type RevisionField = (typeof REVISION_FIELDS)[number];
export type RecipeSnapshot = Pick<Recipe, RevisionField>;

// One row per content edit: the recipe as it was *before* the edit, plus the edit's note.
export interface RecipeRevision {
    _id?: ObjectId;
    recipeId: string;
    userId: string;
    before: RecipeSnapshot;
    changed: RevisionField[];
    note?: string;
    editedAt: Date;
}
