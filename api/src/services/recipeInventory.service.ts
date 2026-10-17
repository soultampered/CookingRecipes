import { inventoryService} from "./inventory.service.js";
import { recipeService} from "./recipes.service.js";
import { nutritionService } from "./nutrition.service.js";
import type { MissingIngredient, RecipeIngredient } from "../types/recipe.js";
import type { Inventory, InventoryAdjustment } from "../types/inventory.js";

export interface PrepareOptions {
    // STO-20: multiplies every ingredient (e.g. 6/4 servings).
    scale?: number;
    // STO-117: per-ingredient amount actually used; wins over scale.
    overrides?: { inventoryItemId: string; quantity: number }[];
}

export interface PrepareResult {
    adjustments: InventoryAdjustment[];
    updatedInventory: Inventory[];
}

export const recipeInventoryService = {
    async deductIngredients(recipeId: string, userId: string, options: PrepareOptions = {}): Promise<PrepareResult> {
        const recipe = await recipeService.getRecipeById(recipeId);

        const scale = options.scale ?? 1;
        if (!recipe.ingredients?.length) {
            await nutritionService.logPreparation(userId, recipe, scale);
            return { adjustments: [], updatedInventory: [] };
        }

        const overrides = new Map((options.overrides ?? []).map((o) => [o.inventoryItemId, o.quantity]));
        const adjustments: InventoryAdjustment[] = recipe.ingredients.map(item => {
            const id = item.inventoryItemId.toString();
            const used = overrides.get(id) ?? item.quantity * scale;
            return { id, amount: -Math.round(used * 1000) / 1000 };
        });

        const updatedInventory = await inventoryService.applyAdjustments(userId, adjustments);
        await nutritionService.logPreparation(userId, recipe, scale);
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

        const makeable = recipes.filter(recipe =>
            recipe.ingredients.every(ingredient => {
                const stock = inventoryMap.get(ingredient.inventoryItemId.toString());
                return stock && stock.quantity >= ingredient.quantity;
            })
        );
        // STO-24: favorites first, then rating. Unrated sits at 3 (neutral), so a
        // disliked (1–2★) recipe sinks below one you haven't rated.
        return makeable.sort((a, b) =>
            Number(b.favorite ?? false) - Number(a.favorite ?? false) ||
            (b.rating ?? 3) - (a.rating ?? 3) ||
            a.title.localeCompare(b.title)
        );
    },
};
