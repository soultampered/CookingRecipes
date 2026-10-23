import type { ObjectId } from "mongodb";

// Personal tokens for integrations (Shortcuts, IFTTT). Only a SHA-256 hash is stored.
export interface ApiToken {
    _id?: ObjectId;
    userId: string;
    name: string;
    tokenHash: string;
    prefix: string; // first chars, for telling tokens apart in the UI
    scopes: "add-items"[];
    createdAt: Date;
    lastUsedAt?: Date;
}
