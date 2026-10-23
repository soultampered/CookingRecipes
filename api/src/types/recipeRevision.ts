import type { ObjectId } from "mongodb";
import type { Recipe } from "./recipe.js";

// Content fields that make a version (not favorite/rating).
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

// The recipe as it was before each edit, plus the edit note.
export interface RecipeRevision {
    _id?: ObjectId;
    recipeId: string;
    userId: string;
    before: RecipeSnapshot;
    changed: RevisionField[];
    note?: string;
    editedAt: Date;
}
