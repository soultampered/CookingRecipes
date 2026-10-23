import { inventoryService} from "./inventory.service.js";
import { recipeService} from "./recipes.service.js";
import { nutritionService } from "./nutrition.service.js";
import { convert } from "./unitConversion.js";
import { accessService } from "./access.service.js";
import { inventoryModel } from "../models/inventory.model.js";
import type { MissingIngredient, Recipe, RecipeIngredient } from "../types/recipe.js";
import type { Inventory, InventoryAdjustment } from "../types/inventory.js";

export interface PrepareOptions {
    // Multiplies every ingredient (e.g. 6/4).
    scale?: number;
    // Amount actually used per ingredient; wins over scale. index beats inventoryItemId.
    overrides?: { inventoryItemId: string; index?: number; quantity: number }[];
    leftovers?: { servings: number; expiresInDays: number };
}

export interface PrepareResult {
    adjustments: InventoryAdjustment[];
    updatedInventory: Inventory[];
    preparationId?: string;
    leftover?: Inventory;
    // Leftovers failed to save; the prepare succeeded.
    leftoverFailed?: boolean;
}

// Recipe amount in the stock unit; null if unconvertible.
function neededInStockUnit(ingredient: RecipeIngredient, stock: Inventory): number | null {
    if (!ingredient.unit || !stock.unit) return ingredient.quantity;
    return convert(ingredient.quantity, ingredient.unit, stock.unit);
}

export const recipeInventoryService = {
    async deductIngredients(recipeId: string, userId: string, options: PrepareOptions = {}): Promise<PrepareResult> {
        const recipe = await recipeService.getRecipeById(recipeId);

        const scale = options.scale ?? 1;
        if (!recipe.ingredients?.length) {
            const preparationId = await nutritionService.logPreparation(userId, recipe, scale);
            return { adjustments: [], updatedInventory: [], preparationId, ...(await this.saveLeftover(userId, recipe, options)) };
        }

        const byIndex = new Map<number, number>();
        const byItem = new Map<string, number>();
        for (const o of options.overrides ?? []) {
            if (o.index != null) byIndex.set(o.index, o.quantity);
            else byItem.set(o.inventoryItemId, o.quantity);
        }
        // Overrides are in the stock unit; convert the default from the recipe unit when possible.
        const stock = new Map(
            (await inventoryService.getInventoryItemsByIds(recipe.ingredients.map((i) => i.inventoryItemId.toString()))).map((s) => [
                s._id.toString(),
                s
            ])
        );
        const adjustments: InventoryAdjustment[] = recipe.ingredients.map((item, i) => {
            const id = item.inventoryItemId.toString();
            const override = byIndex.get(i) ?? byItem.get(id);
            const stockUnit = stock.get(id)?.unit;
            const raw = item.quantity * scale;
            const used = override ?? (item.unit && stockUnit ? (convert(raw, item.unit, stockUnit) ?? raw) : raw);
            return { id, amount: -Math.round(used * 1000) / 1000 };
        });

        const updatedInventory = await inventoryService.applyAdjustments(userId, adjustments, "prepare");
        const preparationId = await nutritionService.logPreparation(userId, recipe, scale);
        return { adjustments, updatedInventory, preparationId, ...(await this.saveLeftover(userId, recipe, options)) };
    },

    // Never throws: stock is already deducted, and a retry would deduct twice.
    async saveLeftover(userId: string, recipe: Recipe, options: PrepareOptions): Promise<{ leftover?: Inventory; leftoverFailed?: boolean }> {
        if (!options.leftovers) return {};
        const { servings, expiresInDays } = options.leftovers;
        try {
            return { leftover: await inventoryService.createLeftover(userId, recipe._id.toString(), recipe.title, servings, expiresInDays) };
        } catch (err) {
            console.error("Failed to save leftover:", err);
            return { leftoverFailed: true };
        }
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
            const needed = stock ? neededInStockUnit(ingredient, stock) : ingredient.quantity;

            // Unconvertible units: only flag when there's no stock at all.
            if (needed === null) {
                if (available <= 0) missing.push({ name: stock!.name, needed: ingredient.quantity, unit: ingredient.unit });
                continue;
            }
            if (available < needed) {
                missing.push({
                    name: stock?.name ?? "Unknown",
                    needed: Math.round((needed - available) * 100) / 100,
                    unit: stock?.unit ?? ingredient.unit,
                });
            }
        }
        return missing;
    },

    async suggestRecipes(userId: string) {
        const recipes = await recipeService.getAllRecipes(userId);
        // Ingredients can be in any reachable pantry.
        const inventory = await inventoryModel.findAccessible(userId, await accessService.householdIdsFor(userId));
        const inventoryMap = new Map(inventory.map(item => [item._id.toString(), item]));

        const makeable = recipes.filter(recipe =>
            recipe.ingredients.every(ingredient => {
                const stock = inventoryMap.get(ingredient.inventoryItemId.toString());
                if (!stock) return false;
                const needed = neededInStockUnit(ingredient, stock);
                return needed === null ? stock.quantity > 0 : stock.quantity >= needed;
            })
        );
        // Favorites first, then rating; unrated = 3, so disliked recipes sink below it.
        return makeable.sort((a, b) =>
            Number(b.favorite ?? false) - Number(a.favorite ?? false) ||
            (b.rating ?? 3) - (a.rating ?? 3) ||
            a.title.localeCompare(b.title)
        );
    },
};
