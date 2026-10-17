import type { ObjectId } from "mongodb";

export type SecurityEventType =
    | "register"
    | "login_success"
    | "login_failed"
    | "email_verified"
    | "password_reset_requested"
    | "password_reset_completed"
    | "token_reuse_detected"
    | "session_revoked"
    | "two_factor_enabled"
    | "two_factor_disabled"
    | "login_2fa_failed";

export interface SecurityEvent {
    _id?: ObjectId;
    userId: string;
    type: SecurityEventType;
    createdAt: Date;
    metadata?: Record<string, unknown>;
}
