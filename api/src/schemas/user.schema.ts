import { z } from "zod";

// Mirrors PATCHABLE_USER_FIELDS in users.route.ts — kept here as validation (correct
// types/lengths) alongside that route's own allowlist (defense in depth, not a
// replacement for it).
export const patchUserSchema = z
    .object({
        displayName: z.string().trim().min(1).max(64),
        avatarUrl: z.string().trim().url().max(2048),
        bio: z.string().trim().max(500),
        preferences: z.object({
            dietaryRestrictions: z.array(z.string().trim().max(64)).max(50),
            preferredUnits: z.enum(["metric", "imperial"]),
            theme: z.enum(["light", "dark"])
        }).partial()
    })
    .partial();
