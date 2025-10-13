import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { Inventory } from "../types/inventory.js";

export const inventoryModel = {
    findAll: async (userId?: string): Promise<Inventory[]> => {
        const db = await connectToDatabase();
        const query = userId ? { userId } : {};
        return db.collection<Inventory>("inventory").find(query).toArray();
    },

    findById: async (id: string): Promise<Inventory> => {
        const db = await connectToDatabase();
        const item = await db.collection<Inventory>("inventory").findOne({ _id: new ObjectId(id) });
        if (!item) {
            throw new Error(`Inventory item with id "${id}" not found`);
        }
        return item;
    },

    create: async (data: Inventory): Promise<Inventory> => {
        const db = await connectToDatabase();
        const now = new Date().toISOString();
        const item: Inventory = { ...data, createdAt: now, updatedAt: now };
        const result = await db.collection<Inventory>("inventory").insertOne(item);
        return { ...item, _id: result.insertedId };
    },

    update: async (id: string, data: Partial<Inventory>): Promise<Inventory> => {
        const db = await connectToDatabase();
        const now = new Date().toISOString();
        const result = await db.collection<Inventory>("inventory").findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...data, updatedAt: now } },
            { returnDocument: "after" }
        );
        if (!result) {
            throw new Error(`Inventory item with id "${id}" not found`);
        }
        return result;
    },

    delete: async (id: string): Promise<boolean> => {
        const db = await connectToDatabase();
        const result = await db.collection<Inventory>("inventory").deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
    },
};
