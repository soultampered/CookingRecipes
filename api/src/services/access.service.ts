import { householdModel } from "../models/household.model.js";

// STO-88: one place that answers "can this user touch this document?". Personal docs
// (no householdId) are owner-only; household docs are open to the household's members.
export interface Scoped {
    userId: string;
    householdId?: string | null;
}

export const accessService = {
    async householdIdsFor(userId: string): Promise<string[]> {
        return (await householdModel.findForUser(userId)).map((h) => h._id!.toString());
    },

    async isMember(userId: string, householdId: string): Promise<boolean> {
        const household = await householdModel.findById(householdId);
        return !!household && household.memberIds.includes(userId);
    },

    async canAccess(userId: string, doc: Scoped): Promise<boolean> {
        if (doc.householdId) return this.isMember(userId, doc.householdId);
        return doc.userId === userId;
    },

    // Validates a client-supplied pantry; null = personal.
    async assertPantry(userId: string, householdId?: string | null): Promise<void> {
        if (householdId && !(await this.isMember(userId, householdId))) throw new Error("FORBIDDEN");
    }
};
