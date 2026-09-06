import { inventoryModel } from "../models/index.js";
import type { Inventory, NewInventory } from "../types/inventory.js"
import { categorizeItemName } from "./foodCategory.service.js";

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

    async createInventory(data: NewInventory) {
        if (!data.name || data.quantity == null) {
            throw new Error("INVALID_INPUT");
        }
        // Category is always derived from the name, never client-supplied — see STO-18.
        const category = await categorizeItemName(data.name);
        return inventoryModel.create({ ...data, category });
    },

    async updateInventory(id: string, data: Partial<Inventory>) {
        // Keep category in sync with name if the item is being renamed; otherwise leave
        // the existing (already-derived) category alone.
        const patch = data.name ? { ...data, category: await categorizeItemName(data.name) } : data;
        const updated = await inventoryModel.update(id, patch);
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

    async checkStock(userId: string, itemName: string) {
        const items = await inventoryModel.findAll(userId);
        return items.find(i => i.name.toLowerCase() === itemName.toLowerCase()) ?? null;
    },

    async bulkAdjust(items: { id: string; amount: number }[]) {
        return Promise.all(
            items.map(({ id, amount }) => this.adjustQuantity(id, amount))
        );
    },
}