import { inventoryModel } from "../models/index.js";
import { InventoryAdjustError, type Inventory, type InventoryAdjustment, type NewInventory } from "../types/inventory.js"
import { categorizeItemName } from "./foodCategory.service.js";

export const inventoryService = {
    async getAllInventory(userId?: string, category?: string, expiringWithinDays?: number) {
        let items = await inventoryModel.findAll(userId);

        if (category) {
            items = items.filter( i => i.category === category);
        }
        // STO-21: includes already-expired items; soonest first. Undated items excluded.
        if (expiringWithinDays != null) {
            const cutoff = Date.now() + expiringWithinDays * 24 * 60 * 60 * 1000;
            items = items
                .filter((i) => i.expirationDte && new Date(i.expirationDte).getTime() <= cutoff)
                .sort((a, b) => new Date(a.expirationDte!).getTime() - new Date(b.expirationDte!).getTime());
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

    // STO-117: all-or-nothing. Pre-checks ownership + stock, then conditional $inc per item;
    // if any decrement loses a race, the ones that landed are rolled back.
    async applyAdjustments(userId: string, adjustments: InventoryAdjustment[]): Promise<Inventory[]> {
        const merged = new Map<string, number>();
        for (const { id, amount } of adjustments) {
            merged.set(id, Math.round(((merged.get(id) ?? 0) + amount) * 1000) / 1000);
        }
        const ids = [...merged.keys()];
        const items = await inventoryModel.findByIds(ids);
        const byId = new Map(items.map((i) => [i._id.toString(), i]));

        const missing = ids.filter((id) => !byId.has(id));
        if (missing.length) throw new InventoryAdjustError("INGREDIENT_NOT_FOUND", missing);
        const foreign = ids.filter((id) => byId.get(id)!.userId !== userId);
        if (foreign.length) throw new InventoryAdjustError("FORBIDDEN", foreign);
        const short = ids.filter((id) => (byId.get(id)!.quantity ?? 0) + merged.get(id)! < 0);
        if (short.length) throw new InventoryAdjustError("INSUFFICIENT_STOCK", short);

        const applied: [string, number][] = [];
        for (const [id, amount] of merged) {
            if (amount === 0) continue;
            if (amount > 0) {
                await inventoryModel.increment(id, amount);
            } else if (!(await inventoryModel.decrementIfAvailable(id, -amount))) {
                for (const [doneId, doneAmount] of applied) await inventoryModel.increment(doneId, -doneAmount);
                throw new InventoryAdjustError("INSUFFICIENT_STOCK", [id]);
            }
            applied.push([id, amount]);
        }
        return inventoryModel.findByIds(ids);
    },
}