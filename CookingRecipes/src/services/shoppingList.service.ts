import { shoppingListModel } from "../models/index.js"
import type { ShoppingList, ShoppingListItem } from "../types/shoppingList.js"



export const shoppingListService = {
    async getAllShoppingLists(userId: string) {
        return shoppingListModel.findAll(userId);
    },

    async getShoppingListById(id: string) {
        const list = await shoppingListModel.ifndById(id);
        if (!list) throw new Error("NOT_FOUND");
        return list;
    },

    async createShoppingList(data: ShoppingList) {
        if (!data.name || !data.items) {
            throw new Error("INVALID_INPUT");
        }
        return shoppingListModel.create(data);
    },

    async updateShoppingList(id: string, data: Partial<ShoppingList>) {
        const updated = await shoppingListModel.update(id, data);
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
        list.items.push(item);
        return shoppingListModel.update(listId, { items: list.items });
    },

    async removeItem(listId: string, itemId: string) {
        const list = await this.getShoppingListById(listId);
        const updatedItems = list.items.filter(i => i._id !== itemId);
        return shoppingListModel.update(listId, { items: updatedItems });
    },

    async toggleItemChecked(listId: string, itemId: string) {
        const list = await this.getShoppingListById(listId);
        const items = list.items.map(i =>
            i._id === itemId ? { ...i, checked: !i.checked } : i
        );
        return shoppingListModel.update(listId, { items });
    },
}