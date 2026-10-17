import type { ObjectId } from "mongodb";

// STO-82: personal access tokens for integrations (Siri Shortcuts, IFTTT → Alexa/Google).
// Only a SHA-256 hash is stored; the plaintext is shown once at creation.
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
