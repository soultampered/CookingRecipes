import { connectToDatabase } from "../mongo.js";
import type { SecurityEvent, SecurityEventType } from "../types/securityEvent.js";

export const securityEventModel = {
    record: async (userId: string, type: SecurityEventType, metadata?: Record<string, unknown>): Promise<void> => {
        const db = await connectToDatabase();
        const event: SecurityEvent = { userId, type, createdAt: new Date(), metadata };
        await db.collection<SecurityEvent>("securityEvent").insertOne(event);
    },

    listByUserId: async (userId: string, limit = 50): Promise<SecurityEvent[]> => {
        const db = await connectToDatabase();
        return db
            .collection<SecurityEvent>("securityEvent")
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }
};
