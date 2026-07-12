import { inventoryModel } from "../models/index.js";
import type { Inventory } from "../types/inventory.js"

export const inventoryService = {
    async getAllInventory(userId?: string, category?: string) {
        const items = await inventoryModel.findAll(userId);

        if (category) {
            return items.filter( i => i.category === category);
        }
        return items;
    },

    async getInventoryById(id: string) {
        const item = await inventoryModel.findById(id);
        if (!item) throw new Error("NOT_FOUND");
        return item;
    },

    async getInventoryItemsByIds(ids: string[]) {
        return inventoryModel.findByIds(ids);
    },

    async createInventory(data: Inventory) {
        if (!data.name || data.quantity == null) {
            throw new Error("INVALID_INPUT");
        }
        return inventoryModel.create(data);
    },

    async updateInventory(id: string, data: Partial<Inventory>) {
        const updated = await inventoryModel.update(id, data);
        if (!updated) throw new Error("NOT_FOUND");
        return updated;
    },

    async deleteInventory(id: string) {
        const deleted = await inventoryModel.delete(id);
        if (!deleted) throw new Error("NOT_FOUND");
        return true;
    },

    async adjustQuantity(id: string, amount: number) {
        const item = await inventoryModel.findById(id);
        if (!item) throw new Error("NOT_FOUND");

        const newQuantity = (item.quantity ?? 0) + amount;
        if (newQuantity < 0) throw new Error("INSUFFICIENT_STOCK");

        return await inventoryModel.update(id, { quantity: newQuantity });
    },

    async checkStock(itemName: string) {
        const allItems = await inventoryModel.findAll();
        return allItems.find(i => i.name.toLowerCase() === itemName.toLowerCase()) ?? null;
    },

    async bulkAdjust(items: { id: string; amount: number }[]) {
        return Promise.all(
            items.map(({ id, amount }) => this.adjustQuantity(id, amount))
        );
    },
}