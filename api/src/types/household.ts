import type { ObjectId } from "mongodb";

// A named pantry. Items and lists with a householdId belong to it; without one = "My kitchen".
export interface Household {
    _id?: ObjectId;
    name: string;
    ownerId: string;
    memberIds: string[]; // always includes ownerId
    inviteCode?: string | null;
    inviteExpiresAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}
