import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { ShoppingList, NewShoppingList } from "../types/shoppingList.js";

export const shoppingListModel = {
    findAllByUserId: async (userId: string): Promise<ShoppingList[]> => {
        const db = await connectToDatabase();
        return db.collection<ShoppingList>("shoppingLists").find({ userId }).toArray();
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
        const result = await db.collection<ShoppingList>("shoppingLists").insertOne(list);
        return {
            ...list,
            _id: result.insertedId
        };
    },

    // Writes only if unchanged since (else LIST_CHANGED).
    update: async (id: string, data: Partial<ShoppingList>, expectedUpdatedAt?: Date): Promise<ShoppingList> => {
        const db = await connectToDatabase();
        const now = new Date();
        const filter = expectedUpdatedAt ? { _id: new ObjectId(id), updatedAt: expectedUpdatedAt } : { _id: new ObjectId(id) };
        const list = await db.collection<ShoppingList>("shoppingLists").findOneAndUpdate(
            filter,
            { $set: { ...data, updatedAt: now } },
            { returnDocument: "after" }
        );
        if (!list && expectedUpdatedAt) {
            const exists = await db.collection<ShoppingList>("shoppingLists").countDocuments({ _id: new ObjectId(id) });
            if (exists) throw new Error("LIST_CHANGED");
        }
        if (!list) {
            throw new Error(`Shopping list with id "${id}" not found`);
        }
        return list;
    },

    delete: async (id: string): Promise<boolean> => {
        const db = await connectToDatabase();
        const list = await db.collection<ShoppingList>("shoppingLists").deleteOne({
            _id: new ObjectId(id)
        });
        return list.deletedCount > 0;
    },

    deleteAllByUserId: async (userId: string): Promise<number> => {
        const db = await connectToDatabase();
        const result = await db.collection<ShoppingList>("shoppingLists").deleteMany({ userId });
        return result.deletedCount;
    }
};
