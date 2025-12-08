import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { ShoppingList, ShoppingListItem } from "../types/shoppingList.js";

export const shoppingListModel = {
    async findAll(userId?: string): Promise<ShoppingList[]> {
        const db = await connectToDatabase();
        const query = userId ? { userId } : {};
        return db.collection<ShoppingList>("shoppingList").find(query).toArray();
    },

    async findById(id: string): Promise<ShoppingList> {
        const db = await connectToDatabase();
        const list = await db.collection<ShoppingList>("shoppingList").findOne({ _id: new ObjectId(id) });
        if (!list) {
            throw new Error(`List item with id "${id}" not found`);
        }
        return list;
    },

    async create(id: string, data: ShoppingList): Promise<ShoppingList> {
        const db = await connectToDatabase();
        const now = new Date().toISOString();
        const item: ShoppingList = { ...data, createdAt: now, updatedAt: now };
        const result = await db.collection<ShoppingList>("shoppingList").insertOne(item);
        return { ...data, _id: result.insertedId };
    },

    async update(id: string, data: Partial<ShoppingList>) {
        const collection = await getShoppingListCollection();
        const result = await collection.findOneAndUpdate(
            { _id: new MongoObjectId(id) },
            { $set: { ...data, updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        return result.value;
    },

    async delete(id: string) {
        const collection = await getShoppingListCollection();
        const result = await collection.deleteOne({ _id: new MongoObjectId(id) });
        return result.deletedCount === 1;
    },
};
