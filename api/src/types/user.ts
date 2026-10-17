import type { ObjectId } from "mongodb";

// STO-33: createdAt/userAgent are copied forward on every rotation, so they describe the
// session (family), not the individual token.
export interface RefreshTokenEntry {
    token: string;
    familyId: string;
    expiresAt: Date;
    used: boolean;
    createdAt?: Date;
    lastUsedAt?: Date;
    userAgent?: string;
}

export interface User {
    _id?: ObjectId;
    username: string;
    email: string;
    password: string; // I think I'll need to hash this
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    savedRecipes?: string[];
    createdRecipes?: string[];
    emailVerified: boolean;
    verificationCode?: string | null;
    verificationCodeExpiresAt?: Date | null;
    verificationCodeAttempts?: number;
    resetCode?: string | null;
    resetCodeExpiresAt?: Date | null;
    resetCodeAttempts?: number;
    mustResetPassword: boolean;
    failedLoginAttempts?: number;
    lockedUntil?: Date | null;
    refreshTokens?: RefreshTokenEntry[];
    preferences?: {
        dietaryRestrictions?: string[];
        preferredUnits?: "metric" | "imperial";
        theme?: "light" | "dark"
    };
    createdAt?: Date;
    updatedAt?: Date;
}

export type NewUser = Omit<
    User,
    "_id" | "createdAt" | "updatedAt"
>;