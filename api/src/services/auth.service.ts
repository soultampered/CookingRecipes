import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userModel, stripPassword } from "../models/user.model.js";
import { emailService } from "./email.service.js";
import type { NewUser, User } from "../types/user.js";

function signToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "30d" });
}

function generateVerificationCode(): { code: string; expiresAt: Date } {
    // Plaintext by design: unlike the password hash, this code is single-use, expires in
    // 10 minutes, and only useful to someone who already has DB access — at which point
    // they could just flip emailVerified directly. Hashing it adds no real protection here.
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    return { code, expiresAt };
}

export const authService = {
    async register(data: NewUser): Promise<{ token: string; user: Omit<User, "password"> }> {
        const existing = await userModel.findByUsernameOrEmail(data.username);
        const existingByEmail = await userModel.findByUsernameOrEmail(data.email);
        if (existing || existingByEmail) throw new Error("DUPLICATE_NAME");

        const hashed = await bcrypt.hash(data.password, 10);
        const { code, expiresAt } = generateVerificationCode();
        const created = await userModel.create({
            ...data,
            password: hashed,
            emailVerified: false,
            verificationCode: code,
            verificationCodeExpiresAt: expiresAt
        });

        try {
            await emailService.sendVerificationEmail(created.email, code);
        } catch (err) {
            // Don't fail registration over a transient email hiccup — the account already
            // exists and works, and the user has a resend-code path if this email never lands.
            console.error("Failed to send verification email:", err);
        }

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

    async verifyEmail(userId: string, code: string): Promise<Omit<User, "password">> {
        const user = await userModel.findById(userId);
        if (user.emailVerified) return stripPassword(user);

        if (!user.verificationCode || user.verificationCode !== code) {
            throw new Error("INVALID_CODE");
        }
        if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) {
            throw new Error("CODE_EXPIRED");
        }

        const updated = await userModel.update(userId, {
            emailVerified: true,
            verificationCode: null,
            verificationCodeExpiresAt: null
        });
        return stripPassword(updated);
    },

    async resendCode(userId: string): Promise<void> {
        const user = await userModel.findById(userId);
        const { code, expiresAt } = generateVerificationCode();
        await userModel.update(userId, {
            verificationCode: code,
            verificationCodeExpiresAt: expiresAt
        });
        // v1: no cooldown enforced — a user could spam this endpoint.
        await emailService.sendVerificationEmail(user.email, code);
    }
};
