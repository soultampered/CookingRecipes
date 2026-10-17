import { connectToDatabase } from "../mongo.js";
import type { Preparation } from "../types/preparation.js";

export const preparationModel = {
    create: async (data: Omit<Preparation, "_id">): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<Preparation>("preparation").insertOne(data);
    },

    findSince: async (userId: string, since: Date): Promise<Preparation[]> => {
        const db = await connectToDatabase();
        return db
            .collection<Preparation>("preparation")
            .find({ userId, preparedAt: { $gte: since } })
            .sort({ preparedAt: 1 })
            .toArray();
    },

    deleteAllByUserId: async (userId: string): Promise<number> => {
        const db = await connectToDatabase();
        const result = await db.collection<Preparation>("preparation").deleteMany({ userId });
        return result.deletedCount;
    }
};
