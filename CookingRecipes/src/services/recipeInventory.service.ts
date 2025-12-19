import { inventoryService} from "./inventory.service.js";
import { recipeService} from "./recipes.service.js";
import type { MissingIngredient, RecipeIngredient } from "../types/recipe.js";
import type { Inventory, InventoryAdjustment } from "../types/inventory.js";

export const recipeInventoryService = {
    async deductIngredients(recipeId: string): Promise<Inventory[]> {
        const recipe = await recipeService.getRecipeById(recipeId);

        if (!recipe.ingredients?.length) return [];

        const adjustments: InventoryAdjustment[] = recipe.ingredients.map(item => ({
            id: item.inventoryItemId.toString(),
            amount: -item.quantity,
        }));

        return inventoryService.bulkAdjust(adjustments);
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

    async suggestRecipes() {
        const recipes = await recipeService.getAllRecipes();
        const inventory = await inventoryService.getAllInventory();
        const inventoryMap = new Map(inventory.map(item => [item._id.toString(), item]));

        return recipes.filter(recipe =>
            recipe.ingredients.every(ingredient => {
                const stock = inventoryMap.get(ingredient.inventoryItemId.toString());
                return stock && stock.quantity >= ingredient.quantity;
            })
        );
    },
};
