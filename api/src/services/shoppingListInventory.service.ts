import { inventoryService } from "./inventory.service.js";
import { INVENTORY_CATEGORIES, type Inventory, type InventoryCategory } from "../types/inventory.js";
import type { ShoppingListItem } from "../types/shoppingList.js";

function asInventoryCategory(category?: string): InventoryCategory | undefined {
    return INVENTORY_CATEGORIES.includes(category as InventoryCategory)
        ? (category as InventoryCategory)
        : undefined;
}

export const shoppingListInventoryService = {
    // Shopping list items carry no unit, so a newly-created inventory entry defaults to
    // "pcs" — the user can correct it from the inventory screen same as any manual entry.
    async addCheckedItemToInventory(userId: string, item: ShoppingListItem): Promise<Inventory> {
        const existing = await inventoryService.checkStock(userId, item.name);
        if (existing) {
            return inventoryService.adjustQuantity(existing._id.toString(), item.quantity);
        }

        return inventoryService.createInventory({
            name: item.name,
            quantity: item.quantity,
            unit: "pcs",
            category: asInventoryCategory(item.category),
            userId
        } as Inventory);
    }
};
