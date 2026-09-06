import { securityEventModel } from "../models/securityEvent.model.js";
import type { SecurityEvent, SecurityEventType } from "../types/securityEvent.js";

export const securityEventService = {
    // Swallows errors deliberately: a failed audit write must never break the auth flow
    // it's recording (e.g. a DB hiccup shouldn't turn a successful login into a 500).
    async record(userId: string, type: SecurityEventType, metadata?: Record<string, unknown>): Promise<void> {
        try {
            await securityEventModel.record(userId, type, metadata);
        } catch (err) {
            console.error(`Failed to record security event "${type}" for user ${userId}:`, err);
        }
    },

    async listForUser(userId: string): Promise<SecurityEvent[]> {
        return securityEventModel.listByUserId(userId);
    }
};
