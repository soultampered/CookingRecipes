import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { ShoppingList, ShoppingListItem, NewShoppingList } from "../types/shoppingList.js";

export const shoppingListModel = {
    findAll: async (): Promise<ShoppingList[]> => {
        const db = await connectToDatabase();
        return db.collection<ShoppingList>("shoppingLists").find().toArray();
    },

    findById: async (id: string): Promise<ShoppingList> => {
        const db = await connectToDatabase();
        const list = await db.collection<ShoppingList>("shoppingLists").findOne({
            _id: new ObjectId(id)
        });
        if (!list) {
            throw new Error(`Shopping List with id "${id}" not found`);
        }
        return list;
    },

    create: async (data: NewShoppingList): Promise<ShoppingList> => {
        const db = await connectToDatabase();
        const now = new Date();
        const list: ShoppingList = {
            ...data,
            createdAt: now,
            updatedAt: now
        };
        const result = await db.collection<ShoppingList>("shoppingList").insertOne(list);
        return {
            ...list,
            _id: result.insertedId
        };
    },

    update: async (id: string, data: Partial<ShoppingList>): Promise<ShoppingList> => {
        const db = await connectToDatabase();
        const now = new Date();
        const list = await db.collection<ShoppingList>("shoppingList").findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...data, updatedAt: now } },
            { returnDocument: "after" }
        );
        if (!list) {
            throw new Error(`Shopping list with id "${id}" not found`);
        }
        return list;
    },

    delete: async (id: string): Promise<boolean> => {
        const db = await connectToDatabase();
        const now = new Date();
        const list = await db.collection<ShoppingList>("shoppingList").deleteOne({
            _id: new ObjectId(id)
        });
        return list.deletedCount > 0;
    },
};
