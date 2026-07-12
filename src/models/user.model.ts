import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { User, NewUser } from "../types/user.js";

export const userModel = {
    findById: async (id: string): Promise<User> => {
        const db = await connectToDatabase();
        const user = await db.collection<User>("user").findOne({
            _id: new ObjectId(id)
        });
        if(!user) {
            throw new Error("No user found");
        }
        return user
    },

    create: async (data: NewUser): Promise<User> => {
        const db = await connectToDatabase();
        const now = new Date();
        const user: User = {
            ...data,
            createdAt: now,
            updatedAt: now
        };
        const result= await db.collection<User>("user").insertOne(user);
        return {
            ...user,
            _id: result.insertedId
        };
    },

    update: async (id: string, data: Partial<User>): Promise<User> => {
        const db = await connectToDatabase();
        const now = new Date();
        const user = await db.collection<User>("user").findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...data, updatedAt: now } },
            { returnDocument: "after"}
        );
        if (!user) {
            throw new Error(`User with id "${id}" not found`);
        }
        return user;
    },

    delete: async (id: string): Promise<boolean> => {
        const db = await connectToDatabase();
        const now = new Date();
        const user = await db.collection<User>("user").deleteOne({
            _id: new ObjectId(id)
        });
        return user.deletedCount > 0;
    }

}