import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userModel, stripPassword } from "../models/user.model.js";
import type { NewUser, User } from "../types/user.js";

function signToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "30d" });
}

export const authService = {
    async register(data: NewUser): Promise<{ token: string; user: Omit<User, "password"> }> {
        const existing = await userModel.findByUsernameOrEmail(data.username);
        const existingByEmail = await userModel.findByUsernameOrEmail(data.email);
        if (existing || existingByEmail) throw new Error("DUPLICATE_NAME");

        const hashed = await bcrypt.hash(data.password, 10);
        const created = await userModel.create({ ...data, password: hashed });
        const token = signToken(created._id!.toString());
        return { token, user: stripPassword(created) };
    },

    async login(identifier: string, password: string): Promise<{ token: string; user: Omit<User, "password"> }> {
        const user = await userModel.findByUsernameOrEmail(identifier);
        if (!user) throw new Error("INVALID_CREDENTIALS");

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) throw new Error("INVALID_CREDENTIALS");

        const token = signToken(user._id!.toString());
        return { token, user: stripPassword(user) };
    },

    async getCurrentUser(userId: string): Promise<Omit<User, "password">> {
        const user = await userModel.findById(userId);
        return stripPassword(user);
    },
};
