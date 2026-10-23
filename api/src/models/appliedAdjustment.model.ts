import { MongoServerError } from "mongodb";
import { connectToDatabase } from "../mongo.js";

// Applied /inventory/adjust ids, so a retry is a no-op. TTL in indexes.ts.
interface AppliedAdjustment {
    _id: string;
    userId: string;
    at: Date;
}

export const appliedAdjustmentModel = {
    // false = this id was already applied.
    claim: async (id: string, userId: string): Promise<boolean> => {
        const db = await connectToDatabase();
        try {
            await db.collection<AppliedAdjustment>("appliedAdjustment").insertOne({ _id: id, userId, at: new Date() });
            return true;
        } catch (err) {
            if (err instanceof MongoServerError && err.code === 11000) return false;
            throw err;
        }
    },

    release: async (id: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<AppliedAdjustment>("appliedAdjustment").deleteOne({ _id: id });
    }
};
