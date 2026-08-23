import { inventoryService } from "./inventory.service.js";
import type { Inventory } from "../types/inventory.js";
import type { ShoppingListItem } from "../types/shoppingList.js";

export const shoppingListInventoryService = {
    // Shopping list items carry no unit, so a newly-created inventory entry defaults to
    // "pcs" — the user can correct it from the inventory screen same as any manual entry.
    // Category is derived server-side by createInventory itself, so it isn't passed here.
    async addCheckedItemToInventory(userId: string, item: ShoppingListItem): Promise<Inventory> {
        const existing = await inventoryService.checkStock(userId, item.name);
        if (existing) {
            return inventoryService.adjustQuantity(existing._id.toString(), item.quantity);
        }

        return inventoryService.createInventory({
            name: item.name,
            quantity: item.quantity,
            unit: "pcs",
            userId
        } as Inventory);
    }
};
