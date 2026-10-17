import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { RecipeRevision } from "../types/recipeRevision.js";

export const recipeRevisionModel = {
    create: async (data: Omit<RecipeRevision, "_id">): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<RecipeRevision>("recipeRevision").insertOne(data);
    },

    findByRecipeId: async (recipeId: string): Promise<RecipeRevision[]> => {
        const db = await connectToDatabase();
        return db.collection<RecipeRevision>("recipeRevision").find({ recipeId }).sort({ editedAt: -1 }).toArray();
    },

    findById: async (id: string): Promise<RecipeRevision | null> => {
        const db = await connectToDatabase();
        return db.collection<RecipeRevision>("recipeRevision").findOne({ _id: new ObjectId(id) });
    },

    deleteByRecipeId: async (recipeId: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<RecipeRevision>("recipeRevision").deleteMany({ recipeId });
    },

    deleteAllByUserId: async (userId: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<RecipeRevision>("recipeRevision").deleteMany({ userId });
    }
};
