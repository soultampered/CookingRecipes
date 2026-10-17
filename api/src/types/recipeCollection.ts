import type { ObjectId } from "mongodb";

// STO-79: user-defined grouping above tags. A recipe can be in many collections.
export interface RecipeCollection {
    _id?: ObjectId;
    userId: string;
    name: string;
    recipeIds: string[];
    createdAt?: Date;
    updatedAt?: Date;
}
