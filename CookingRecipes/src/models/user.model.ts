import { connectToDatabase } from "../mongo.js";
import type { User } from "../types/user.js";
import type { Collection } from "mongodb";

export async function getUserCollection(): Promise<Collection<User>> {
    const db = await connectToDatabase();
    return db.collection<User>("Users");
}