import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { userModel, stripPassword } from "../models/user.model.js";
import { apiTokenModel } from "../models/apiToken.model.js";
import { emailService } from "./email.service.js";
import { securityEventService } from "./securityEvent.service.js";
import { isPasswordStrong } from "./passwordPolicy.js";
import { signingSecret } from "./jwtSecrets.js";
import { tokenRevocation } from "./tokenRevocation.js";
import type { NewUser, RefreshTokenEntry, User } from "../types/user.js";

const ACCESS_TOKEN_TTL = "15m";
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// sid = session (token family), so revoking a session cuts its access token too.
function signAccessToken(userId: string, familyId: string): string {
    return jwt.sign({ userId, sid: familyId }, signingSecret, { expiresIn: ACCESS_TOKEN_TTL });
}

function revokeSessionTokens(familyIds: (string | undefined)[]): void {
    tokenRevocation.revokeSessions(familyIds.filter((id): id is string => !!id), Date.now() + ACCESS_TOKEN_TTL_MS);
}

// Display-only, so cap it.
function cleanUserAgent(userAgent?: string): string | undefined {
    return userAgent ? userAgent.slice(0, 300) : undefined;
}

function generateRefreshToken(
    familyId: string,
    session: { createdAt: Date; userAgent?: string }
): RefreshTokenEntry {
    const now = new Date();
    return {
        token: crypto.randomBytes(32).toString("hex"),
        familyId,
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
        used: false,
        createdAt: session.createdAt,
        lastUsedAt: now,
        userAgent: session.userAgent
    };
}

async function issueTokenPair(
    userId: string,
    userAgent?: string
): Promise<{ accessToken: string; refreshToken: string }> {
    const familyId = crypto.randomUUID();
    const entry = generateRefreshToken(familyId, { createdAt: new Date(), userAgent: cleanUserAgent(userAgent) });
    await userModel.addRefreshToken(userId, entry);
    return { accessToken: signAccessToken(userId, familyId), refreshToken: entry.token };
}

type AuthResult = { accessToken: string; refreshToken: string; user: Omit<User, "password"> };
// With 2FA on, login returns a challenge instead of tokens.
export type LoginResult = AuthResult | { twoFactorRequired: true; challengeId: string };

export interface SessionSummary {
    id: string;
    createdAt?: Date;
    lastUsedAt?: Date;
    userAgent?: string;
    current: boolean;
}

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

// Distinct from STO-31's IP-based rate limiting: this defends one specific account
// against a distributed attack (many IPs), which IP rate limiting alone can't catch.
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MAX_MINUTES = 60;

// Independent of STO-31's per-endpoint rate limit: a per-account attempt counter that
// invalidates the code itself once exhausted, so a generous rate limit elsewhere can't
// leave the full 10-minute window open to guess all 1M combinations.
const MAX_CODE_ATTEMPTS = 5;

// requestPasswordReset's early-return branches (unknown identifier, cooldown active) return
// near-instantly, while the full path does a DB write + email-send round trip — that gap is
// itself a timing side-channel an attacker could use to enumerate valid accounts even though
// the response body is identical either way. Padding every path out to the same floor closes
// that gap without slowing the common case by much.
const MIN_PASSWORD_RESET_REQUEST_MS = 300;

async function padUntil(startedAt: number, minMs: number): Promise<void> {
    const remaining = minMs - (Date.now() - startedAt);
    if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
    }
}

function lockoutMinutesFor(failedAttempts: number): number {
    return Math.min(2 ** (failedAttempts - LOCKOUT_THRESHOLD), LOCKOUT_MAX_MINUTES);
}

// Constant-time compare.
function sameCode(expected: string | null | undefined, given: string): boolean {
    if (!expected) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(given);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function generateCode(): { code: string; expiresAt: Date } {
    // Plaintext by design: unlike the password hash, this code is single-use, expires in
    // 10 minutes, and only useful to someone who already has DB access — at which point
    // they could just flip emailVerified directly. Hashing it adds no real protection here.
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    return { code, expiresAt };
}

export const authService = {
    async register(
        data: Pick<NewUser, "username" | "email" | "password">,
        userAgent?: string
    ): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, "password"> }> {
        if (!isPasswordStrong(data.password)) throw new Error("WEAK_PASSWORD");

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

        const { accessToken, refreshToken } = await issueTokenPair(created._id!.toString(), userAgent);
        await securityEventService.record(created._id!.toString(), "register");
        return { accessToken, refreshToken, user: stripPassword(created) };
    },

    async login(
        identifier: string,
        password: string,
        userAgent?: string
    ): Promise<LoginResult> {
        const user = await userModel.findByUsernameOrEmail(identifier);
        if (!user) throw new Error("INVALID_CREDENTIALS");

        const userId = user._id!.toString();

        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new Error("ACCOUNT_LOCKED");
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            const failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
            const update: Partial<User> = { failedLoginAttempts };
            if (failedLoginAttempts >= LOCKOUT_THRESHOLD) {
                update.lockedUntil = new Date(Date.now() + lockoutMinutesFor(failedLoginAttempts) * 60 * 1000);
            }
            await userModel.update(userId, update);
            await securityEventService.record(userId, "login_failed");
            throw new Error("INVALID_CREDENTIALS");
        }

        if (user.failedLoginAttempts || user.lockedUntil) {
            await userModel.update(userId, { failedLoginAttempts: 0, lockedUntil: null });
        }

        if (user.twoFactorEnabled) {
            const { code, expiresAt } = generateCode();
            const challengeId = crypto.randomBytes(24).toString("hex");
            try {
                await emailService.sendLoginCode(user.email, code);
            } catch (err) {
                console.error("Failed to send login code:", err);
                throw new Error("CODE_SEND_FAILED");
            }
            await userModel.update(userId, {
                loginChallenge: challengeId,
                loginCode: code,
                loginCodeExpiresAt: expiresAt,
                loginCodeAttempts: 0
            });
            return { twoFactorRequired: true, challengeId };
        }

        const { accessToken, refreshToken } = await issueTokenPair(userId, userAgent);
        await securityEventService.record(userId, "login_success");
        return { accessToken, refreshToken, user: stripPassword(user) };
    },

    async verifyLoginCode(challengeId: string, code: string, userAgent?: string): Promise<AuthResult> {
        // Claim an attempt atomically before comparing, so parallel guesses can't beat the cap.
        const user = await userModel.claimLoginCodeAttempt(challengeId, MAX_CODE_ATTEMPTS);
        if (!user) {
            const existing = await userModel.findByLoginChallenge(challengeId);
            if (!existing) throw new Error("INVALID_CODE");
            // Burn the challenge: a new code needs the password again.
            await userModel.update(existing._id!.toString(), { loginChallenge: null, loginCode: null, loginCodeExpiresAt: null });
            throw new Error("TOO_MANY_ATTEMPTS");
        }
        const userId = user._id!.toString();

        if (!user.loginCodeExpiresAt || user.loginCodeExpiresAt < new Date()) {
            throw new Error("CODE_EXPIRED");
        }
        if (!sameCode(user.loginCode, code)) {
            await securityEventService.record(userId, "login_2fa_failed");
            throw new Error("INVALID_CODE");
        }

        const updated = await userModel.update(userId, {
            loginChallenge: null,
            loginCode: null,
            loginCodeExpiresAt: null,
            loginCodeAttempts: 0
        });
        const { accessToken, refreshToken } = await issueTokenPair(userId, userAgent);
        await securityEventService.record(userId, "login_success", { twoFactor: true });
        return { accessToken, refreshToken, user: stripPassword(updated) };
    },

    // Password re-check: a stolen unlocked phone can't turn 2FA off.
    async setTwoFactor(userId: string, enabled: boolean, password: string): Promise<Omit<User, "password">> {
        const user = await userModel.findById(userId);
        if (!(await bcrypt.compare(password, user.password))) throw new Error("INVALID_CREDENTIALS");
        // Codes go here; an unverified address could lock the user out.
        if (enabled && !user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");
        const updated = await userModel.update(userId, { twoFactorEnabled: enabled });
        // Enabling 2FA also revokes older tokens.
        if (enabled) await apiTokenModel.deleteAllByUserId(userId);
        await securityEventService.record(userId, enabled ? "two_factor_enabled" : "two_factor_disabled");
        return stripPassword(updated);
    },

    async getCurrentUser(userId: string): Promise<Omit<User, "password">> {
        const user = await userModel.findById(userId);
        return stripPassword(user);
    },

    async verifyEmail(userId: string, code: string): Promise<Omit<User, "password">> {
        const user = await userModel.findById(userId);
        if (user.emailVerified) return stripPassword(user);

        if ((user.verificationCodeAttempts ?? 0) >= MAX_CODE_ATTEMPTS) {
            throw new Error("TOO_MANY_ATTEMPTS");
        }

        if (!user.verificationCode || user.verificationCode !== code) {
            await userModel.update(userId, {
                verificationCodeAttempts: (user.verificationCodeAttempts ?? 0) + 1
            });
            throw new Error("INVALID_CODE");
        }
        if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) {
            throw new Error("CODE_EXPIRED");
        }

        const updated = await userModel.update(userId, {
            emailVerified: true,
            verificationCode: null,
            verificationCodeExpiresAt: null,
            verificationCodeAttempts: 0
        });
        await securityEventService.record(userId, "email_verified");
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
            verificationCodeExpiresAt: expiresAt,
            verificationCodeAttempts: 0
        });
    },

    // Deliberately never throws and always looks the same from the outside (route always
    // returns one generic message) — whether the identifier matches an account, is on
    // cooldown, or email delivery fails are all indistinguishable to the caller. Revealing
    // any of that would let someone enumerate which emails/usernames have accounts.
    async requestPasswordReset(identifier: string): Promise<void> {
        const start = Date.now();

        const user = await userModel.findByUsernameOrEmail(identifier);
        if (!user) {
            await padUntil(start, MIN_PASSWORD_RESET_REQUEST_MS);
            return;
        }

        if (user.resetCodeExpiresAt) {
            const issuedAt = user.resetCodeExpiresAt.getTime() - CODE_TTL_MS;
            if (Date.now() - issuedAt < RESEND_COOLDOWN_MS) {
                await padUntil(start, MIN_PASSWORD_RESET_REQUEST_MS);
                return;
            }
        }

        const { code, expiresAt } = generateCode();
        try {
            await emailService.sendPasswordResetEmail(user.email, code);
        } catch (err) {
            console.error("Failed to send password reset email:", err);
            await padUntil(start, MIN_PASSWORD_RESET_REQUEST_MS);
            return;
        }
        await userModel.update(user._id!.toString(), {
            resetCode: code,
            resetCodeExpiresAt: expiresAt,
            resetCodeAttempts: 0
        });
        await securityEventService.record(user._id!.toString(), "password_reset_requested");
        await padUntil(start, MIN_PASSWORD_RESET_REQUEST_MS);
    },

    async resetPassword(identifier: string, code: string, newPassword: string): Promise<void> {
        const user = await userModel.findByUsernameOrEmail(identifier);

        if (user && (user.resetCodeAttempts ?? 0) >= MAX_CODE_ATTEMPTS) {
            throw new Error("INVALID_RESET");
        }

        const valid =
            user &&
            user.resetCode &&
            user.resetCode === code &&
            user.resetCodeExpiresAt &&
            user.resetCodeExpiresAt > new Date();

        if (!valid) {
            if (user) {
                await userModel.update(user._id!.toString(), {
                    resetCodeAttempts: (user.resetCodeAttempts ?? 0) + 1
                });
            }
            throw new Error("INVALID_RESET");
        }
        if (!isPasswordStrong(newPassword)) throw new Error("WEAK_PASSWORD");

        const hashed = await bcrypt.hash(newPassword, 10);
        // A reset clears every refresh token (kill every session everywhere, not just this
        // one) and lifts any forced-reset flag — this is also how a reuse-detection-triggered
        // forced reset gets resolved, reusing this flow rather than a separate "clear the flag"
        // step.
        await userModel.update(user._id!.toString(), {
            password: hashed,
            resetCode: null,
            resetCodeExpiresAt: null,
            resetCodeAttempts: 0,
            refreshTokens: [],
            mustResetPassword: false
        });
        revokeSessionTokens((user.refreshTokens ?? []).map((t) => t.familyId));
        // Personal API tokens are credentials too.
        await apiTokenModel.deleteAllByUserId(user._id!.toString());
        await securityEventService.record(user._id!.toString(), "password_reset_completed");
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
            revokeSessionTokens([entry.familyId]);
            await userModel.update(userId, { mustResetPassword: true });
            console.warn(`Refresh token reuse detected for user ${userId} — family ${entry.familyId} revoked`);
            await securityEventService.record(userId, "token_reuse_detected", { familyId: entry.familyId });
            throw new Error("TOKEN_REUSE_DETECTED");
        }

        if (entry.expiresAt < new Date()) {
            throw new Error("INVALID_REFRESH_TOKEN");
        }

        await userModel.markRefreshTokenUsed(userId, refreshToken);
        const newEntry = generateRefreshToken(entry.familyId, {
            createdAt: entry.createdAt ?? new Date(),
            userAgent: entry.userAgent
        });
        await userModel.addRefreshToken(userId, newEntry);

        return { accessToken: signAccessToken(userId, entry.familyId), refreshToken: newEntry.token };
    },

    async revokeRefreshToken(userId: string, refreshToken: string): Promise<void> {
        const user = await userModel.findById(userId);
        const entry = user.refreshTokens?.find((t) => t.token === refreshToken);
        if (!entry) return;
        await userModel.removeRefreshTokenFamily(userId, entry.familyId);
    },

    // One row per family (its live token). Older tokens lack createdAt/userAgent.
    async listSessions(userId: string, currentRefreshToken?: string): Promise<SessionSummary[]> {
        const user = await userModel.findById(userId);
        const now = new Date();
        const currentFamily = user.refreshTokens?.find((t) => t.token === currentRefreshToken)?.familyId;
        return (user.refreshTokens ?? [])
            .filter((t) => !t.used && t.expiresAt > now)
            .map((t) => ({
                id: t.familyId,
                createdAt: t.createdAt,
                lastUsedAt: t.lastUsedAt,
                userAgent: t.userAgent,
                current: t.familyId === currentFamily
            }))
            .sort((a, b) => Number(b.current) - Number(a.current) || (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0));
    },

    async revokeSession(userId: string, familyId: string): Promise<void> {
        const user = await userModel.findById(userId);
        if (!user.refreshTokens?.some((t) => t.familyId === familyId)) throw new Error("NOT_FOUND");
        await userModel.removeRefreshTokenFamily(userId, familyId);
        revokeSessionTokens([familyId]);
        await securityEventService.record(userId, "session_revoked", { familyId });
    },

    async revokeOtherSessions(userId: string, currentRefreshToken: string): Promise<void> {
        const user = await userModel.findById(userId);
        const current = user.refreshTokens?.find((t) => t.token === currentRefreshToken);
        if (!current) throw new Error("NOT_FOUND");
        await userModel.removeOtherRefreshTokenFamilies(userId, current.familyId);
        revokeSessionTokens((user.refreshTokens ?? []).map((t) => t.familyId).filter((id) => id !== current.familyId));
        // "Everywhere else" includes voice shortcuts using personal API tokens.
        await apiTokenModel.deleteAllByUserId(userId);
        await securityEventService.record(userId, "session_revoked", { others: true });
    },

    async listSecurityEvents(userId: string) {
        return securityEventService.listForUser(userId);
    }
};
