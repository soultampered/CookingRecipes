import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { ApiToken } from "../types/apiToken.js";

const NAME = "apiToken";

export const apiTokenModel = {
    create: async (data: Omit<ApiToken, "_id">): Promise<ApiToken> => {
        const db = await connectToDatabase();
        const result = await db.collection<ApiToken>(NAME).insertOne(data);
        return { ...data, _id: result.insertedId };
    },

    findByHash: async (tokenHash: string): Promise<ApiToken | null> => {
        const db = await connectToDatabase();
        return db.collection<ApiToken>(NAME).findOne({ tokenHash });
    },

    findAllByUserId: async (userId: string): Promise<ApiToken[]> => {
        const db = await connectToDatabase();
        return db.collection<ApiToken>(NAME).find({ userId }).sort({ createdAt: -1 }).toArray();
    },

    touch: async (id: ObjectId): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<ApiToken>(NAME).updateOne({ _id: id }, { $set: { lastUsedAt: new Date() } });
    },

    delete: async (id: string, userId: string): Promise<boolean> => {
        if (!ObjectId.isValid(id)) return false;
        const db = await connectToDatabase();
        return (await db.collection<ApiToken>(NAME).deleteOne({ _id: new ObjectId(id), userId })).deletedCount > 0;
    },

    deleteAllByUserId: async (userId: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<ApiToken>(NAME).deleteMany({ userId });
    }
};
