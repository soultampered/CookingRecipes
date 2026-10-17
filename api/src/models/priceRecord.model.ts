import { connectToDatabase } from "../mongo.js";
import type { PriceRecord } from "../types/priceRecord.js";

export const priceRecordModel = {
    create: async (data: Omit<PriceRecord, "_id">): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<PriceRecord>("priceRecord").insertOne(data);
    },

    findByKeys: async (userId: string, itemKeys: string[]): Promise<PriceRecord[]> => {
        const db = await connectToDatabase();
        return db
            .collection<PriceRecord>("priceRecord")
            .find({ userId, itemKey: { $in: itemKeys } })
            .sort({ recordedAt: -1 })
            .limit(2000)
            .toArray();
    },

    findAllByUserId: async (userId: string): Promise<PriceRecord[]> => {
        const db = await connectToDatabase();
        return db.collection<PriceRecord>("priceRecord").find({ userId }).sort({ recordedAt: 1 }).toArray();
    },

    deleteAllByUserId: async (userId: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<PriceRecord>("priceRecord").deleteMany({ userId });
    }
};
