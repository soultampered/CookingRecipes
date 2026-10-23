import { ObjectId } from "mongodb";
import { shoppingListModel } from "../models/index.js";
import type { ShoppingList, ShoppingListItem } from "../types/shoppingList.js";
import { categorizeItemName } from "./foodCategory.service.js";
import { priceHistoryService } from "./priceHistory.service.js";
import { featuresService } from "./features.service.js";
import { convert } from "./unitConversion.js";

type IncomingItem = Omit<ShoppingListItem, "_id"> & { _id?: ObjectId | string };

function withIds(items: IncomingItem[]): ShoppingListItem[] {
    return items.map((i) => ({ ...i, _id: i._id ? new ObjectId(i._id.toString()) : new ObjectId() }));
}

// Restores ids stripped by the old PATCH bug.
async function repairItemIds(list: ShoppingList): Promise<ShoppingList> {
    if (list.items.every((i) => i._id)) return list;
    return shoppingListModel.update(list._id!.toString(), { items: withIds(list.items) });
}

export const shoppingListService = {
    async getAllShoppingLists(userId: string, householdId: string | null = null) {
        const lists = await shoppingListModel.findByScope(userId, householdId);
        return Promise.all(lists.map(repairItemIds));
    },

    async getShoppingListById(id: string) {
        const list = await shoppingListModel.findById(id);
        if (!list) throw new Error("NOT_FOUND");
        return repairItemIds(list);
    },

    async createShoppingList(data: ShoppingList) {
        if (!data.name || !data.items) {
            throw new Error("INVALID_INPUT");
        }
        return shoppingListModel.create(data);
    },

    async updateShoppingList(
        id: string,
        data: Omit<Partial<ShoppingList>, "items"> & { items?: IncomingItem[]; ifUpdatedAt?: string }
    ) {
        const { ifUpdatedAt, ...rest } = data;
        const patch: Partial<ShoppingList> = { ...rest, items: rest.items ? withIds(rest.items) : undefined };
        if (!rest.items) delete patch.items;
        const updated = await shoppingListModel.update(id, patch, ifUpdatedAt ? new Date(ifUpdatedAt) : undefined);
        if (!updated) throw new Error("NOT_FOUND");
        return updated;
    },

    async deleteShoppingList(id: string) {
        const deleted = await shoppingListModel.delete(id);
        if (!deleted) throw new Error("NOT_FOUND");
        return true;
    },

    async addItem(listId: string, item: ShoppingListItem) {
        const list = await this.getShoppingListById(listId);
        // Case-insensitive dedupe, matching inventoryService.checkStock's pattern — without
        // this, adding "Milk" twice creates two separate rows instead of merging quantities.
        const existing = list.items.find(
            (i) => i.name.trim().toLowerCase() === item.name.trim().toLowerCase()
        );
        if (existing) {
            // Merge when units match or convert; else a new row.
            const amount =
                existing.unit === item.unit
                    ? item.quantity
                    : existing.unit && item.unit
                        ? convert(item.quantity, item.unit, existing.unit)
                        : null;
            if (amount !== null) {
                const items = list.items.map((i) =>
                    i === existing ? { ...i, quantity: Math.round((i.quantity + amount) * 100) / 100 } : i
                );
                return shoppingListModel.update(listId, { items });
            }
        }
        // Category is always derived from the name, never client-supplied — see STO-18.
        const category = await categorizeItemName(item.name);
        // Prefill the last price paid (at this store if known), once priceWatch (2.3) is on.
        const price =
            item.price ??
            (featuresService.isOn("priceWatch", list.userId) ? await priceHistoryService.suggestedPrice(list.userId, item.name, list.store) : undefined);
        list.items.push({ ...item, category, price, _id: new ObjectId() });
        return shoppingListModel.update(listId, { items: list.items });
    },

    async removeItem(listId: string, itemId: string) {
        const list = await this.getShoppingListById(listId);
        const updatedItems = list.items.filter((item) => item._id?.toString() !== itemId);
        return shoppingListModel.update(listId, { items: updatedItems });
    },

    async toggleItemChecked(listId: string, itemId: string) {
        const list = await this.getShoppingListById(listId);
        const items = list.items.map((item) =>
            item._id?.toString() === itemId ? { ...item, checked: !item.checked } : item
        );
        return shoppingListModel.update(listId, { items });
    }
};
