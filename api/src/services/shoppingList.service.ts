import { ObjectId } from "mongodb";
import { shoppingListModel } from "../models/index.js";
import type { ShoppingList, ShoppingListItem } from "../types/shoppingList.js";
import { categorizeItemName } from "./foodCategory.service.js";
import { priceHistoryService } from "./priceHistory.service.js";

type IncomingItem = Omit<ShoppingListItem, "_id"> & { _id?: ObjectId | string };

function withIds(items: IncomingItem[]): ShoppingListItem[] {
    return items.map((i) => ({ ...i, _id: i._id ? new ObjectId(i._id.toString()) : new ObjectId() }));
}

// Lists saved while the PATCH bug stripped ids get them back on first read.
async function repairItemIds(list: ShoppingList): Promise<ShoppingList> {
    if (list.items.every((i) => i._id)) return list;
    return shoppingListModel.update(list._id!.toString(), { items: withIds(list.items) });
}

export const shoppingListService = {
    async getAllShoppingLists(userId: string) {
        const lists = await shoppingListModel.findAllByUserId(userId);
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

    async updateShoppingList(id: string, data: Omit<Partial<ShoppingList>, "items"> & { items?: IncomingItem[] }) {
        const patch: Partial<ShoppingList> = { ...data, items: data.items ? withIds(data.items) : undefined };
        if (!data.items) delete patch.items;
        const updated = await shoppingListModel.update(id, patch);
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
            const items = list.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + item.quantity } : i
            );
            return shoppingListModel.update(listId, { items });
        }
        // Category is always derived from the name, never client-supplied — see STO-18.
        const category = await categorizeItemName(item.name);
        // STO-90: prefill with what you last paid (at this list's store if known).
        const price = item.price ?? (await priceHistoryService.suggestedPrice(list.userId, item.name, list.store));
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
