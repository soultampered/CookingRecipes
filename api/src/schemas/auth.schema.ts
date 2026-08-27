import { z } from "zod";

// Only username/email/password are ever set by the client at registration — everything
// else on User (emailVerified, refreshTokens, savedRecipes, ...) is server-controlled.
// Zod objects strip unrecognized keys by default, so this also closes off any of those
// fields being injected via the request body, same spirit as STO-29's PATCH allowlist.
// bcrypt silently truncates at 72 bytes, so anything longer is pointless and confusing
// (two different passwords past that point would hash identically) — capped here rather
// than left as a latent surprise.
const passwordField = z.string().min(1).max(72);

export const registerSchema = z.object({
    username: z.string().trim().min(1).max(64),
    email: z.string().trim().email().max(254),
    password: passwordField
});

export const loginSchema = z.object({
    identifier: z.string().trim().min(1).max(254),
    password: passwordField
});

export const verifyEmailSchema = z.object({
    code: z.string().trim().length(6)
});

export const forgotPasswordSchema = z.object({
    identifier: z.string().trim().min(1).max(254)
});

export const resetPasswordSchema = z.object({
    identifier: z.string().trim().min(1).max(254),
    code: z.string().trim().length(6),
    newPassword: passwordField
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1)
});
