import type { ObjectId } from "mongodb";

export type SecurityEventType =
    | "register"
    | "login_success"
    | "login_failed"
    | "email_verified"
    | "password_reset_requested"
    | "password_reset_completed"
    | "token_reuse_detected";

export interface SecurityEvent {
    _id?: ObjectId;
    userId: string;
    type: SecurityEventType;
    createdAt: Date;
    metadata?: Record<string, unknown>;
}
