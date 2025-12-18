import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { User } from "../types/user.js";

export const userModel = {
    findById: async(id: string): Promise<User> => {
        const db = await connectToDatabase();
        const user = await db.collection<User>("user").findOne({
            _id: new ObjectId(id)
        });
        if(!user) {
            throw new Error("No user found");
        }
        return user
    },

}