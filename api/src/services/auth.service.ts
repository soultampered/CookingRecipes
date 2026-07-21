import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { userModel, stripPassword } from "../models/user.model.js";
import { emailService } from "./email.service.js";
import type { NewUser, User } from "../types/user.js";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function signAccessToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_TTL });
}

function generateRefreshToken(familyId: string): {
    token: string;
    familyId: string;
    expiresAt: Date;
    used: boolean;
} {
    return {
        token: crypto.randomBytes(32).toString("hex"),
        familyId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        used: false
    };
}

async function issueTokenPair(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const familyId = crypto.randomUUID();
    const entry = generateRefreshToken(familyId);
    await userModel.addRefreshToken(userId, entry);
    return { accessToken: signAccessToken(userId), refreshToken: entry.token };
}

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function generateCode(): { code: string; expiresAt: Date } {
    // Plaintext by design: unlike the password hash, this code is single-use, expires in
    // 10 minutes, and only useful to someone who already has DB access — at which point
    // they could just flip emailVerified directly. Hashing it adds no real protection here.
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    return { code, expiresAt };
}

export const authService = {
    async register(
        data: NewUser
    ): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, "password"> }> {
        const existing = await userModel.findByUsernameOrEmail(data.username);
        const existingByEmail = await userModel.findByUsernameOrEmail(data.email);
        if (existing || existingByEmail) throw new Error("DUPLICATE_NAME");

        const hashed = await bcrypt.hash(data.password, 10);
        const { code, expiresAt } = generateCode();
        const created = await userModel.create({
            ...data,
            password: hashed,
            emailVerified: false,
            verificationCode: code,
            verificationCodeExpiresAt: expiresAt,
            mustResetPassword: false
        });

        try {
            await emailService.sendVerificationEmail(created.email, code);
        } catch (err) {
            // Don't fail registration over a transient email hiccup — the account already
            // exists and works, and the user has a resend-code path if this email never lands.
            console.error("Failed to send verification email:", err);
        }

        const { accessToken, refreshToken } = await issueTokenPair(created._id!.toString());
        return { accessToken, refreshToken, user: stripPassword(created) };
    },

    async login(
        identifier: string,
        password: string
    ): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, "password"> }> {
        const user = await userModel.findByUsernameOrEmail(identifier);
        if (!user) throw new Error("INVALID_CREDENTIALS");

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) throw new Error("INVALID_CREDENTIALS");

        const { accessToken, refreshToken } = await issueTokenPair(user._id!.toString());
        return { accessToken, refreshToken, user: stripPassword(user) };
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

        // The previous code's issued-at time is derived from its expiry (issuedAt = expiresAt
        // - TTL) rather than storing a separate timestamp field just for this cooldown check.
        if (user.verificationCodeExpiresAt) {
            const issuedAt = user.verificationCodeExpiresAt.getTime() - CODE_TTL_MS;
            const elapsed = Date.now() - issuedAt;
            if (elapsed < RESEND_COOLDOWN_MS) {
                throw new Error("COOLDOWN_ACTIVE");
            }
        }

        const { code, expiresAt } = generateCode();
        // Send before persisting: if delivery fails, the previous code stays valid and the
        // cooldown doesn't start, rather than silently invalidating a working code for nothing.
        await emailService.sendVerificationEmail(user.email, code);
        await userModel.update(userId, {
            verificationCode: code,
            verificationCodeExpiresAt: expiresAt
        });
    },

    // Deliberately never throws and always looks the same from the outside (route always
    // returns one generic message) — whether the identifier matches an account, is on
    // cooldown, or email delivery fails are all indistinguishable to the caller. Revealing
    // any of that would let someone enumerate which emails/usernames have accounts.
    async requestPasswordReset(identifier: string): Promise<void> {
        const user = await userModel.findByUsernameOrEmail(identifier);
        if (!user) return;

        if (user.resetCodeExpiresAt) {
            const issuedAt = user.resetCodeExpiresAt.getTime() - CODE_TTL_MS;
            if (Date.now() - issuedAt < RESEND_COOLDOWN_MS) return;
        }

        const { code, expiresAt } = generateCode();
        try {
            await emailService.sendPasswordResetEmail(user.email, code);
        } catch (err) {
            console.error("Failed to send password reset email:", err);
            return;
        }
        await userModel.update(user._id!.toString(), { resetCode: code, resetCodeExpiresAt: expiresAt });
    },

    async resetPassword(identifier: string, code: string, newPassword: string): Promise<void> {
        const user = await userModel.findByUsernameOrEmail(identifier);
        const valid =
            user &&
            user.resetCode &&
            user.resetCode === code &&
            user.resetCodeExpiresAt &&
            user.resetCodeExpiresAt > new Date();

        if (!valid) throw new Error("INVALID_RESET");

        const hashed = await bcrypt.hash(newPassword, 10);
        // A reset clears every refresh token (kill every session everywhere, not just this
        // one) and lifts any forced-reset flag — this is also how a reuse-detection-triggered
        // forced reset gets resolved, reusing this flow rather than a separate "clear the flag"
        // step.
        await userModel.update(user._id!.toString(), {
            password: hashed,
            resetCode: null,
            resetCodeExpiresAt: null,
            refreshTokens: [],
            mustResetPassword: false
        });
    },

    async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        const user = await userModel.findByRefreshToken(refreshToken);
        if (!user) throw new Error("INVALID_REFRESH_TOKEN");

        const entry = user.refreshTokens?.find((t) => t.token === refreshToken);
        if (!entry) throw new Error("INVALID_REFRESH_TOKEN");

        const userId = user._id!.toString();

        if (entry.used) {
            // This exact token was already consumed once — in normal operation that never
            // happens, so its reappearance means it was stolen and someone is replaying it.
            // Can't tell which side (this request or the earlier one) is the thief, so kill
            // the whole family and require a fresh password before the account is usable
            // again, rather than just quietly rejecting this one request.
            await userModel.removeRefreshTokenFamily(userId, entry.familyId);
            await userModel.update(userId, { mustResetPassword: true });
            console.warn(`Refresh token reuse detected for user ${userId} — family ${entry.familyId} revoked`);
            throw new Error("TOKEN_REUSE_DETECTED");
        }

        if (entry.expiresAt < new Date()) {
            throw new Error("INVALID_REFRESH_TOKEN");
        }

        await userModel.markRefreshTokenUsed(userId, refreshToken);
        const newEntry = generateRefreshToken(entry.familyId);
        await userModel.addRefreshToken(userId, newEntry);

        return { accessToken: signAccessToken(userId), refreshToken: newEntry.token };
    },

    async revokeRefreshToken(userId: string, refreshToken: string): Promise<void> {
        const user = await userModel.findById(userId);
        const entry = user.refreshTokens?.find((t) => t.token === refreshToken);
        if (!entry) return;
        await userModel.removeRefreshTokenFamily(userId, entry.familyId);
    }
};
