import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongo.js";
import type { User, NewUser } from "../types/user.js";

export function stripPassword(
    user: User
): Omit<
    User,
    | "password"
    | "verificationCode"
    | "verificationCodeExpiresAt"
    | "resetCode"
    | "resetCodeExpiresAt"
    | "refreshTokens"
> {
    const {
        password,
        verificationCode,
        verificationCodeExpiresAt,
        resetCode,
        resetCodeExpiresAt,
        refreshTokens,
        ...rest
    } = user;
    return rest;
}

type RefreshTokenEntry = NonNullable<User["refreshTokens"]>[number];

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

    findByUsernameOrEmail: async (identifier: string): Promise<User | null> => {
        const db = await connectToDatabase();
        return db.collection<User>("user").findOne({
            $or: [{ username: identifier }, { email: identifier }]
        });
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
    },

    findByRefreshToken: async (token: string): Promise<User | null> => {
        const db = await connectToDatabase();
        return db.collection<User>("user").findOne({ "refreshTokens.token": token });
    },

    addRefreshToken: async (userId: string, entry: RefreshTokenEntry): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<User>("user").updateOne(
            { _id: new ObjectId(userId) },
            { $push: { refreshTokens: entry }, $set: { updatedAt: new Date() } }
        );
    },

    markRefreshTokenUsed: async (userId: string, token: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<User>("user").updateOne(
            { _id: new ObjectId(userId), "refreshTokens.token": token },
            { $set: { "refreshTokens.$.used": true, updatedAt: new Date() } }
        );
    },

    removeRefreshTokenFamily: async (userId: string, familyId: string): Promise<void> => {
        const db = await connectToDatabase();
        await db.collection<User>("user").updateOne(
            { _id: new ObjectId(userId) },
            { $pull: { refreshTokens: { familyId } }, $set: { updatedAt: new Date() } }
        );
    }

}