import { connectToDatabase } from "../mongo.js";
import type { InventoryEvent } from "../types/inventoryEvent.js";

export const inventoryEventModel = {
    createMany: async (events: Omit<InventoryEvent, "_id">[]): Promise<void> => {
        if (!events.length) return;
        const db = await connectToDatabase();
        await db.collection<InventoryEvent>("inventoryEvent").insertMany(events);
    },

    findSince: async (userId: string, since: Date): Promise<InventoryEvent[]> => {
        const db = await connectToDatabase();
        return db.collection<InventoryEvent>("inventoryEvent").find({ userId, at: { $gte: since } }).toArray();
    },

    deleteAllByUserId: async (userId: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<InventoryEvent>("inventoryEvent").deleteMany({ userId });
    }
};
