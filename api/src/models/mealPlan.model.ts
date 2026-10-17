import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { MealPlanEntry } from "../types/mealPlan.js";

const NAME = "mealPlanEntry";

export const mealPlanModel = {
    findRange: async (userId: string, from: string, to: string): Promise<MealPlanEntry[]> => {
        const db = await connectToDatabase();
        return db.collection<MealPlanEntry>(NAME).find({ userId, date: { $gte: from, $lte: to } }).sort({ date: 1, createdAt: 1 }).toArray();
    },

    findById: async (id: string): Promise<MealPlanEntry | null> => {
        if (!ObjectId.isValid(id)) return null;
        const db = await connectToDatabase();
        return db.collection<MealPlanEntry>(NAME).findOne({ _id: new ObjectId(id) });
    },

    create: async (data: Omit<MealPlanEntry, "_id" | "createdAt">): Promise<MealPlanEntry> => {
        const db = await connectToDatabase();
        const doc: MealPlanEntry = { ...data, createdAt: new Date() };
        const result = await db.collection<MealPlanEntry>(NAME).insertOne(doc);
        return { ...doc, _id: result.insertedId };
    },

    update: async (id: string, data: Partial<MealPlanEntry>): Promise<MealPlanEntry | null> => {
        const db = await connectToDatabase();
        return db.collection<MealPlanEntry>(NAME).findOneAndUpdate({ _id: new ObjectId(id) }, { $set: data }, { returnDocument: "after" });
    },

    delete: async (id: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<MealPlanEntry>(NAME).deleteOne({ _id: new ObjectId(id) });
    },

    deleteByRecipeId: async (recipeId: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<MealPlanEntry>(NAME).deleteMany({ recipeId });
    },

    findAllByUserId: async (userId: string): Promise<MealPlanEntry[]> => {
        const db = await connectToDatabase();
        return db.collection<MealPlanEntry>(NAME).find({ userId }).sort({ date: 1 }).toArray();
    },

    deleteAllByUserId: async (userId: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<MealPlanEntry>(NAME).deleteMany({ userId });
    }
};
