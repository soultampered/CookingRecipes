import { householdModel } from "../models/household.model.js";
import { inventoryModel } from "../models/inventory.model.js";
import { shoppingListModel } from "../models/shoppingList.model.js";
import { recipeModel } from "../models/recipe.model.js";
import { userModel } from "../models/user.model.js";
import type { Household } from "../types/household.js";
import crypto from "crypto";

// 8 chars, no look-alikes (0/O/1/I/L) ≈ 2^39 codes.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newInviteCode(): string {
    return Array.from(crypto.randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
const MAX_MEMBERS = 20;
// A code posted once in a group chat shouldn't work forever.
const INVITE_TTL_MS = 3 * 24 * 60 * 60 * 1000;

function inviteLive(h: Household): boolean {
    return !!h.inviteCode && (!h.inviteExpiresAt || h.inviteExpiresAt > new Date());
}

export interface HouseholdView {
    _id: string;
    name: string;
    ownerId: string;
    isOwner: boolean;
    members: { _id: string; username: string; displayName?: string }[];
    inviteCode?: string | null;
    inviteExpiresAt?: string | null;
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
        // Only the owner sees the code, and only while it's live.
        inviteCode: h.ownerId === userId ? (inviteLive(h) ? h.inviteCode : null) : undefined,
        inviteExpiresAt: h.ownerId === userId && inviteLive(h) ? (h.inviteExpiresAt?.toISOString() ?? null) : undefined
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

    // Nothing is destroyed: items and lists move to the owner's own kitchen.
    async remove(id: string, userId: string): Promise<void> {
        await owned(id, userId);
        await inventoryModel.moveHousehold(id, userId);
        await shoppingListModel.moveHousehold(id, userId);
        // Else canAccess() checks a deleted household and locks owners out.
        await recipeModel.unshareFromHousehold(id);
        await householdModel.delete(id);
    },

    async createInvite(id: string, userId: string): Promise<HouseholdView> {
        await owned(id, userId);
        return view(
            (await householdModel.update(id, { inviteCode: newInviteCode(), inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS) }))!,
            userId
        );
    },

    async revokeInvite(id: string, userId: string): Promise<HouseholdView> {
        await owned(id, userId);
        return view((await householdModel.update(id, { inviteCode: null, inviteExpiresAt: null }))!, userId);
    },

    async join(userId: string, code: string): Promise<HouseholdView> {
        const household = await householdModel.findByInviteCode(code.trim().toUpperCase());
        if (!household) throw new Error("INVALID_CODE");
        if (!inviteLive(household)) throw new Error("EXPIRED_CODE");
        if (!household.memberIds.includes(userId)) {
            if (household.memberIds.length >= MAX_MEMBERS) throw new Error("FULL");
            await householdModel.addMember(household._id!.toString(), userId);
        }
        return view((await householdModel.findById(household._id!.toString()))!, userId);
    },

    // Leaving keeps the household's data; the member just loses access.
    async leave(id: string, userId: string): Promise<void> {
        const household = await householdModel.findById(id);
        if (!household || !household.memberIds.includes(userId)) throw new Error("NOT_FOUND");
        if (household.ownerId === userId) throw new Error("OWNER_CANNOT_LEAVE");
        await householdModel.removeMember(id, userId);
        // Their recipes leave with them.
        await recipeModel.unshareFromHousehold(id, userId);
    },

    async removeMember(id: string, userId: string, memberId: string): Promise<HouseholdView> {
        const household = await owned(id, userId);
        if (memberId === household.ownerId) throw new Error("OWNER_CANNOT_LEAVE");
        await householdModel.removeMember(id, memberId);
        await recipeModel.unshareFromHousehold(id, memberId);
        return view((await householdModel.findById(id))!, userId);
    },

    // Account deletion: hand owned households to the next member, or delete them if alone.
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
