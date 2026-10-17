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
    // STO-32: opt-in email OTP at login. loginChallenge ties the code to one login attempt.
    twoFactorEnabled?: boolean;
    loginChallenge?: string | null;
    loginCode?: string | null;
    loginCodeExpiresAt?: Date | null;
    loginCodeAttempts?: number;
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