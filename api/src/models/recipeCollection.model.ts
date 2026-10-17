import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { RecipeCollection } from "../types/recipeCollection.js";

const NAME = "recipeCollection";

export const recipeCollectionModel = {
    findAllByUserId: async (userId: string): Promise<RecipeCollection[]> => {
        const db = await connectToDatabase();
        return db.collection<RecipeCollection>(NAME).find({ userId }).sort({ name: 1 }).toArray();
    },

    findById: async (id: string): Promise<RecipeCollection | null> => {
        if (!ObjectId.isValid(id)) return null;
        const db = await connectToDatabase();
        return db.collection<RecipeCollection>(NAME).findOne({ _id: new ObjectId(id) });
    },

    create: async (data: Omit<RecipeCollection, "_id" | "createdAt" | "updatedAt">): Promise<RecipeCollection> => {
        const db = await connectToDatabase();
        const now = new Date();
        const doc: RecipeCollection = { ...data, createdAt: now, updatedAt: now };
        const result = await db.collection<RecipeCollection>(NAME).insertOne(doc);
        return { ...doc, _id: result.insertedId };
    },

    update: async (id: string, data: Partial<RecipeCollection>): Promise<RecipeCollection | null> => {
        const db = await connectToDatabase();
        return db
            .collection<RecipeCollection>(NAME)
            .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { ...data, updatedAt: new Date() } }, { returnDocument: "after" });
    },

    addRecipe: async (id: string, recipeId: string): Promise<RecipeCollection | null> => {
        const db = await connectToDatabase();
        return db
            .collection<RecipeCollection>(NAME)
            .findOneAndUpdate(
                { _id: new ObjectId(id) },
                { $addToSet: { recipeIds: recipeId }, $set: { updatedAt: new Date() } },
                { returnDocument: "after" }
            );
    },

    removeRecipe: async (id: string, recipeId: string): Promise<RecipeCollection | null> => {
        const db = await connectToDatabase();
        return db
            .collection<RecipeCollection>(NAME)
            .findOneAndUpdate(
                { _id: new ObjectId(id) },
                { $pull: { recipeIds: recipeId }, $set: { updatedAt: new Date() } },
                { returnDocument: "after" }
            );
    },

    pullRecipeEverywhere: async (recipeId: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<RecipeCollection>(NAME).updateMany({ recipeIds: recipeId }, { $pull: { recipeIds: recipeId } });
    },

    delete: async (id: string): Promise<boolean> => {
        const db = await connectToDatabase();
        const result = await db.collection<RecipeCollection>(NAME).deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
    },

    deleteAllByUserId: async (userId: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<RecipeCollection>(NAME).deleteMany({ userId });
    }
};
