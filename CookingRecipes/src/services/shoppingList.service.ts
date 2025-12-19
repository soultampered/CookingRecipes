import { shoppingListModel } from "../models/index.js"
import type { ShoppingList, ShoppingListItem } from "../types/shoppingList.js"



export const shoppingListService = {
    async getAllShoppingLists() {
        return shoppingListModel.findAll();
    },

    async getShoppingListById(id: string) {
        const list = await shoppingListModel.findById(id);
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
        const updatedItems = list.items.filter(item => item._id?.toString() !== itemId);
        return shoppingListModel.update(listId, { items: updatedItems });
    },

    async toggleItemChecked(listId: string, itemId: string) {
        const list = await this.getShoppingListById(listId);
        const items = list.items.map(item =>
            item._id?.toString() === itemId ? { ...item, checked: !item.checked } : item
        );
        return shoppingListModel.update(listId, { items });
    },
}