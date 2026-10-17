import { inventoryService } from "./inventory.service.js";
import type { Inventory } from "../types/inventory.js";
import type { ShoppingListItem } from "../types/shoppingList.js";
import { convert } from "./unitConversion.js";

export const shoppingListInventoryService = {
    // No unit = "pcs"; recipe-generated items convert into the existing unit when possible.
    // Category is derived server-side by createInventory itself, so it isn't passed here.
    // Same pantry as the list.
    async addCheckedItemToInventory(userId: string, item: ShoppingListItem, householdId: string | null = null): Promise<Inventory> {
        const existing = await inventoryService.checkStock(userId, item.name, householdId);
        if (existing) {
            const amount = item.unit ? (convert(item.quantity, item.unit, existing.unit) ?? item.quantity) : item.quantity;
            return inventoryService.adjustQuantity(existing._id.toString(), amount);
        }

        return inventoryService.createInventory({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit ?? "pcs",
            userId,
            householdId
        } as Inventory);
    }
};
