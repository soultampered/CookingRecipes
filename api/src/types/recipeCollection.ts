import type { ObjectId } from "mongodb";

// User grouping above tags; a recipe can be in many.
export interface RecipeCollection {
    _id?: ObjectId;
    userId: string;
    name: string;
    recipeIds: string[];
    createdAt?: Date;
    updatedAt?: Date;
}
