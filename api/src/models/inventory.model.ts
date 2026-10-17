import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { Inventory, NewInventory } from "../types/inventory.js";

export const inventoryModel = {
    findAll: async (userId?: string): Promise<Inventory[]> => {
        const db = await connectToDatabase();
        const query = userId ? { userId } : {};
        return db.collection<Inventory>("inventory").find(query).toArray();
    },

    // STO-88: one pantry. householdId null matches personal items (field null or missing).
    findByScope: async (userId: string, householdId: string | null): Promise<Inventory[]> => {
        const db = await connectToDatabase();
        const query = householdId ? { householdId } : { userId, householdId: null };
        return db.collection<Inventory>("inventory").find(query).toArray();
    },

    // Personal pantry plus every household the user belongs to.
    findAccessible: async (userId: string, householdIds: string[]): Promise<Inventory[]> => {
        const db = await connectToDatabase();
        return db
            .collection<Inventory>("inventory")
            .find({ $or: [{ userId, householdId: null }, { householdId: { $in: householdIds } }] })
            .toArray();
    },

    moveHousehold: async (fromHouseholdId: string, toUserId: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<Inventory>("inventory").updateMany({ householdId: fromHouseholdId }, { $set: { householdId: null, userId: toUserId } });
    },

    deleteByHouseholdId: async (householdId: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<Inventory>("inventory").deleteMany({ householdId });
    },

    deletePersonalByUserId: async (userId: string): Promise<number> => {
        const db = await connectToDatabase();
        const result = await db.collection<Inventory>("inventory").deleteMany({ userId, householdId: null });
        return result.deletedCount;
    },

    findById: async (id: string): Promise<Inventory> => {
        const db = await connectToDatabase();
        const item = await db.collection<Inventory>("inventory").findOne({
            _id: new ObjectId(id)
        });
        if (!item) {
            throw new Error(`Inventory item with id "${id}" not found`);
        }
        return item;
    },

    findByIds: async (ids: string[]) => {
        const db = await connectToDatabase();
        const objectIds = ids.map(id => new ObjectId(id));
        const items = await db.collection<Inventory>("inventory").find({
            _id: { $in: objectIds }
        }).toArray();
        if (items.length === 0) {
            return [];
        }
        return items;
    },

    create: async (data: NewInventory): Promise<Inventory> => {
        const db = await connectToDatabase();
        const now = new Date();
        // Generated here rather than left to insertOne's auto-generation so `item` can be
        // fully typed as Inventory (which requires _id) without a second round-trip to
        // reattach result.insertedId afterward.
        const item: Inventory = {
            ...data,
            _id: new ObjectId(),
            createdAt: now,
            updatedAt: now
        };
        await db.collection<Inventory>("inventory").insertOne(item);
        return item;
    },

    update: async (id: string, data: Partial<Inventory>): Promise<Inventory> => {
        const db = await connectToDatabase();
        const now = new Date();
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
        const result = await db.collection<Inventory>("inventory").deleteOne({
            _id: new ObjectId(id)
        });
        return result.deletedCount > 0;
    },

    // STO-117: atomic per document — only decrements if enough stock is there at write time.
    decrementIfAvailable: async (id: string, amount: number): Promise<boolean> => {
        const db = await connectToDatabase();
        const result = await db.collection<Inventory>("inventory").updateOne(
            { _id: new ObjectId(id), quantity: { $gte: amount } },
            { $inc: { quantity: -amount }, $set: { updatedAt: new Date() } }
        );
        return result.modifiedCount === 1;
    },

    increment: async (id: string, amount: number): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<Inventory>("inventory").updateOne(
            { _id: new ObjectId(id) },
            { $inc: { quantity: amount }, $set: { updatedAt: new Date() } }
        );
    },

    deleteAllByUserId: async (userId: string): Promise<number> => {
        const db = await connectToDatabase();
        const result = await db.collection<Inventory>("inventory").deleteMany({ userId });
        return result.deletedCount;
    },
};
