import type { IndexDescription } from "mongodb";
import { connectToDatabase } from "./mongo.js";

// Revoked tokens/codes are null, so unique indexes are partial on string type; queries add $type: "string".
const stringOnly = (field: string) => ({ partialFilterExpression: { [field]: { $type: "string" } } });

const INDEXES: Record<string, IndexDescription[]> = {
    recipes: [
        { key: { userId: 1 } },
        { key: { householdId: 1 }, sparse: true },
        { key: { shareToken: 1 }, unique: true, ...stringOnly("shareToken") }
    ],
    inventory: [{ key: { userId: 1, householdId: 1 } }, { key: { householdId: 1 }, sparse: true }],
    shoppingLists: [{ key: { userId: 1 } }, { key: { householdId: 1 }, sparse: true }],
    household: [{ key: { memberIds: 1 } }, { key: { inviteCode: 1 }, unique: true, ...stringOnly("inviteCode") }],
    apiToken: [{ key: { tokenHash: 1 }, unique: true }, { key: { userId: 1 } }],
    user: [{ key: { loginChallenge: 1 }, ...stringOnly("loginChallenge") }, { key: { "refreshTokens.token": 1 } }],
    preparation: [{ key: { userId: 1, preparedAt: 1 } }],
    priceRecord: [{ key: { userId: 1, itemKey: 1, recordedAt: -1 } }],
    inventoryEvent: [{ key: { userId: 1, at: 1 } }, { key: { itemId: 1, at: 1 } }],
    mealPlanEntry: [{ key: { userId: 1, date: 1 } }, { key: { recipeId: 1 } }],
    recipeCollection: [{ key: { userId: 1 } }, { key: { recipeIds: 1 } }],
    recipeRevision: [{ key: { recipeId: 1 } }, { key: { userId: 1 } }],
    securityEvent: [{ key: { userId: 1 } }],
    "photos.files": [{ key: { "metadata.userId": 1 } }, { key: { uploadDate: 1 } }]
};

// Idempotent, runs at startup; a failure logs instead of crashing.
export async function ensureIndexes(): Promise<void> {
    const db = await connectToDatabase();
    for (const [name, indexes] of Object.entries(INDEXES)) {
        try {
            await db.collection(name).createIndexes(indexes);
        } catch (err) {
            console.error(`Failed to create indexes on ${name}:`, err);
        }
    }
}
