import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { Preparation } from "../types/preparation.js";

export const preparationModel = {
    create: async (data: Omit<Preparation, "_id">): Promise<string> => {
        const db = await connectToDatabase();
        return (await db.collection<Preparation>("preparation").insertOne(data)).insertedId.toString();
    },

    deleteOwned: async (id: string, userId: string): Promise<boolean> => {
        if (!ObjectId.isValid(id)) return false;
        const db = await connectToDatabase();
        return (await db.collection<Preparation>("preparation").deleteOne({ _id: new ObjectId(id), userId })).deletedCount === 1;
    },

    findSince: async (userId: string, since: Date): Promise<Preparation[]> => {
        const db = await connectToDatabase();
        return db
            .collection<Preparation>("preparation")
            .find({ userId, preparedAt: { $gte: since } })
            .sort({ preparedAt: 1 })
            .toArray();
    },

    findAllByUserId: async (userId: string): Promise<Preparation[]> => {
        const db = await connectToDatabase();
        return db.collection<Preparation>("preparation").find({ userId }).sort({ preparedAt: 1 }).toArray();
    },

    deleteAllByUserId: async (userId: string): Promise<number> => {
        const db = await connectToDatabase();
        const result = await db.collection<Preparation>("preparation").deleteMany({ userId });
        return result.deletedCount;
    }
};
