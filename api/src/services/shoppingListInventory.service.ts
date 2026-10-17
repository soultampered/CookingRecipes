import { inventoryService } from "./inventory.service.js";
import type { Inventory } from "../types/inventory.js";
import type { ShoppingListItem } from "../types/shoppingList.js";
import { convert } from "./unitConversion.js";

export const shoppingListInventoryService = {
    // Items without a unit (hand-added) default to "pcs"; recipe-generated ones (STO-80)
    // carry the stock unit and convert into an existing item's unit when possible.
    // Category is derived server-side by createInventory itself, so it isn't passed here.
    async addCheckedItemToInventory(userId: string, item: ShoppingListItem): Promise<Inventory> {
        const existing = await inventoryService.checkStock(userId, item.name);
        if (existing) {
            const amount = item.unit ? (convert(item.quantity, item.unit, existing.unit) ?? item.quantity) : item.quantity;
            return inventoryService.adjustQuantity(existing._id.toString(), amount);
        }

        return inventoryService.createInventory({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit ?? "pcs",
            userId
        } as Inventory);
    }
};
