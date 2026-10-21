import { inventoryService} from "./inventory.service.js";
import { recipeService} from "./recipes.service.js";
import type { MissingIngredient, RecipeIngredient } from "../types/recipe.js";
import type { Inventory, InventoryAdjustment } from "../types/inventory.js";

export interface PrepareOptions {
    // Multiplies every ingredient (e.g. 6/4).
    scale?: number;
    // Amount actually used per ingredient; wins over scale. index beats inventoryItemId.
    overrides?: { inventoryItemId: string; index?: number; quantity: number }[];
}

export interface PrepareResult {
    adjustments: InventoryAdjustment[];
    updatedInventory: Inventory[];
}

export const recipeInventoryService = {
    async deductIngredients(recipeId: string, userId: string, options: PrepareOptions = {}): Promise<PrepareResult> {
        const recipe = await recipeService.getRecipeById(recipeId);

        if (!recipe.ingredients?.length) return { adjustments: [], updatedInventory: [] };

        const scale = options.scale ?? 1;
        const byIndex = new Map<number, number>();
        const byItem = new Map<string, number>();
        for (const o of options.overrides ?? []) {
            if (o.index != null) byIndex.set(o.index, o.quantity);
            else byItem.set(o.inventoryItemId, o.quantity);
        }
        const adjustments: InventoryAdjustment[] = recipe.ingredients.map((item, i) => {
            const id = item.inventoryItemId.toString();
            const used = byIndex.get(i) ?? byItem.get(id) ?? item.quantity * scale;
            return { id, amount: -Math.round(used * 1000) / 1000 };
        });

        const updatedInventory = await inventoryService.applyAdjustments(userId, adjustments);
        return { adjustments, updatedInventory };
    },

    async getMissingIngredients(recipeId: string): Promise<MissingIngredient[]> {
        const recipe = await recipeService.getRecipeById(recipeId);
        const inventoryIds = recipe.ingredients.map((i: RecipeIngredient) => i.inventoryItemId.toString());
        const inventoryItems = await inventoryService.getInventoryItemsByIds(inventoryIds);

        const inventoryMap = new Map<string, typeof inventoryItems[0]>(
            inventoryItems.map(item => [item._id.toString(), item])
        );

        const missing = [];

        for (const ingredient of recipe.ingredients) {
            const stock = inventoryMap.get(ingredient.inventoryItemId.toString());
            const available = stock?.quantity ?? 0;

            if (available < ingredient.quantity) {
                missing.push({
                    name: stock?.name ?? "Unknown",
                    needed: ingredient.quantity - available,
                    unit: ingredient.unit ?? stock?.unit,
                });
            }
        }
        return missing;
    },

    async suggestRecipes(userId: string) {
        const recipes = await recipeService.getAllRecipes(userId);
        const inventory = await inventoryService.getAllInventory(userId);
        const inventoryMap = new Map(inventory.map(item => [item._id.toString(), item]));

        return recipes.filter(recipe =>
            recipe.ingredients.every(ingredient => {
                const stock = inventoryMap.get(ingredient.inventoryItemId.toString());
                return stock && stock.quantity >= ingredient.quantity;
            })
        );
    },
};
