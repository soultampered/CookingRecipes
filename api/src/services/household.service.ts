import { householdModel } from "../models/household.model.js";
import { inventoryModel } from "../models/inventory.model.js";
import { shoppingListModel } from "../models/shoppingList.model.js";
import { userModel } from "../models/user.model.js";
import type { Household } from "../types/household.js";

export interface HouseholdView {
    _id: string;
    name: string;
    ownerId: string;
    isOwner: boolean;
    members: { _id: string; username: string; displayName?: string }[];
    inviteCode?: string | null;
}

async function owned(id: string, userId: string): Promise<Household> {
    const household = await householdModel.findById(id);
    if (!household || !household.memberIds.includes(userId)) throw new Error("NOT_FOUND");
    if (household.ownerId !== userId) throw new Error("FORBIDDEN");
    return household;
}

async function view(h: Household, userId: string): Promise<HouseholdView> {
    const members = await Promise.all(
        h.memberIds.map(async (id) => {
            const u = await userModel.findById(id).catch(() => null);
            return { _id: id, username: u?.username ?? "former member", displayName: u?.displayName };
        })
    );
    return {
        _id: h._id!.toString(),
        name: h.name,
        ownerId: h.ownerId,
        isOwner: h.ownerId === userId,
        members,
        // Only the owner sees the code (STO-8).
        inviteCode: h.ownerId === userId ? (h.inviteCode ?? null) : undefined
    };
}

export const householdService = {
    async list(userId: string): Promise<HouseholdView[]> {
        return Promise.all((await householdModel.findForUser(userId)).map((h) => view(h, userId)));
    },

    async create(userId: string, name: string): Promise<HouseholdView> {
        return view(await householdModel.create({ name, ownerId: userId, memberIds: [userId] }), userId);
    },

    async rename(id: string, userId: string, name: string): Promise<HouseholdView> {
        await owned(id, userId);
        return view((await householdModel.update(id, { name }))!, userId);
    },

    // Nothing is destroyed: the pantry's items and lists move to the owner's own kitchen.
    async remove(id: string, userId: string): Promise<void> {
        await owned(id, userId);
        await inventoryModel.moveHousehold(id, userId);
        await shoppingListModel.moveHousehold(id, userId);
        await householdModel.delete(id);
    },

    // Account deletion: hand owned households to the next member, or delete them (and their
    // data) if the user was alone; drop the user from the rest.
    async handleUserDeletion(userId: string): Promise<void> {
        for (const h of await householdModel.findForUser(userId)) {
            const others = h.memberIds.filter((m) => m !== userId);
            const id = h._id!.toString();
            if (others.length === 0) {
                await inventoryModel.deleteByHouseholdId(id);
                await shoppingListModel.deleteByHouseholdId(id);
                await householdModel.delete(id);
            } else {
                await householdModel.update(id, {
                    memberIds: others,
                    ownerId: h.ownerId === userId ? others[0] : h.ownerId
                });
            }
        }
    }
};
