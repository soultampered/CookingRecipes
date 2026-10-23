import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { Household } from "../types/household.js";

const NAME = "household";

export const householdModel = {
    findById: async (id: string): Promise<Household | null> => {
        if (!ObjectId.isValid(id)) return null;
        const db = await connectToDatabase();
        return db.collection<Household>(NAME).findOne({ _id: new ObjectId(id) });
    },

    findForUser: async (userId: string): Promise<Household[]> => {
        const db = await connectToDatabase();
        return db.collection<Household>(NAME).find({ memberIds: userId }).sort({ createdAt: 1 }).toArray();
    },

    create: async (data: Omit<Household, "_id" | "createdAt" | "updatedAt">): Promise<Household> => {
        const db = await connectToDatabase();
        const now = new Date();
        const doc: Household = { ...data, createdAt: now, updatedAt: now };
        const result = await db.collection<Household>(NAME).insertOne(doc);
        return { ...doc, _id: result.insertedId };
    },

    update: async (id: string, data: Partial<Household>): Promise<Household | null> => {
        const db = await connectToDatabase();
        return db
            .collection<Household>(NAME)
            .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { ...data, updatedAt: new Date() } }, { returnDocument: "after" });
    },

    delete: async (id: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<Household>(NAME).deleteOne({ _id: new ObjectId(id) });
    }
};
