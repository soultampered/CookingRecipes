import { connectToDatabase } from "../mongo.js";
import type { InventoryItem} from "../types/inventoryItem.js";
import type { Collection } from "mongodb";

export async function getInventoryCollection(): Promise<Collection<InventoryItem>> {
    const db = await connectToDatabase();
    return db.collection<InventoryItem>("inventory");
}