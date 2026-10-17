import type { ObjectId } from "mongodb";

// STO-88: a named pantry (home, cottage, …). STO-8 lets other users join one.
// Inventory items and shopping lists with a householdId belong to it; without one they're
// the user's personal pantry ("My kitchen").
export interface Household {
    _id?: ObjectId;
    name: string;
    ownerId: string;
    memberIds: string[]; // always includes ownerId
    inviteCode?: string | null; // STO-8
    createdAt?: Date;
    updatedAt?: Date;
}
