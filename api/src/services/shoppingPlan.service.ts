import { recipeService } from "./recipes.service.js";
import { inventoryService } from "./inventory.service.js";
import { shoppingListService } from "./shoppingList.service.js";
import { convert } from "./unitConversion.js";
import { accessService } from "./access.service.js";
import type { Unit } from "../types/unit.js";
import type { ShoppingList } from "../types/shoppingList.js";

// One combined, deduplicated list for several recipes.
export interface RecipeRequest {
    recipeId: string;
    scale?: number;
}

export interface PlannedItem {
    inventoryItemId: string;
    name: string;
    unit: Unit;
    needed: number;
    have: number;
    toBuy: number;
    recipes: string[];
    // A recipe unit can't convert to the stock unit (e.g. cup vs g).
    unitMismatch: boolean;
    // Those amounts, kept in their own units instead of being summed into needed.
    unconverted: { quantity: number; unit: Unit }[];
}

function round(n: number) {
    return Math.round(n * 100) / 100;
}

export const shoppingPlanService = {
    // Against one pantry's stock (personal by default).
    async plan(userId: string, requests: RecipeRequest[], householdId: string | null = null): Promise<PlannedItem[]> {
        await accessService.assertPantry(userId, householdId);
        const inventory = await inventoryService.getAllInventory(userId, undefined, householdId);
        const stock = new Map(inventory.map((i) => [i._id.toString(), i]));
        const totals = new Map<string, PlannedItem>();

        for (const { recipeId, scale = 1 } of requests) {
            const recipe = await recipeService.getRecipeById(recipeId).catch(() => null);
            if (!recipe || !(await accessService.canAccess(userId, recipe))) throw new Error("UNKNOWN_RECIPE");
            for (const ing of recipe.ingredients) {
                const item = stock.get(ing.inventoryItemId);
                if (!item) continue; // ingredient's inventory item was deleted
                const raw = ing.quantity * scale;
                // Sum in the stock unit when convertible, else as-is.
                const converted = ing.unit ? convert(raw, ing.unit, item.unit) : raw;
                const row = totals.get(ing.inventoryItemId) ?? {
                    inventoryItemId: ing.inventoryItemId,
                    name: item.name,
                    unit: item.unit,
                    needed: 0,
                    have: item.quantity,
                    toBuy: 0,
                    recipes: [],
                    unitMismatch: false,
                    unconverted: []
                };
                if (converted === null) {
                    row.unitMismatch = true;
                    const same = row.unconverted.find((u) => u.unit === ing.unit);
                    if (same) same.quantity = round(same.quantity + raw);
                    else row.unconverted.push({ quantity: round(raw), unit: ing.unit! });
                } else {
                    row.needed += converted;
                }
                if (!row.recipes.includes(recipe.title)) row.recipes.push(recipe.title);
                totals.set(ing.inventoryItemId, row);
            }
        }

        return [...totals.values()]
            .map((r) => ({ ...r, needed: round(r.needed), toBuy: round(Math.max(0, r.needed - r.have)) }))
            .sort((a, b) => b.toBuy - a.toBuy || a.name.localeCompare(b.name));
    },

    // Lists only shortfalls; appends to a list (merging by name) or creates one.
    async createList(
        userId: string,
        requests: RecipeRequest[],
        options: { name?: string; listId?: string; householdId?: string | null }
    ): Promise<ShoppingList> {
        let list: ShoppingList;
        let householdId = options.householdId ?? null;
        if (options.listId) {
            list = await shoppingListService.getShoppingListById(options.listId);
            if (!(await accessService.canAccess(userId, list))) throw new Error("FORBIDDEN");
            householdId = list.householdId ?? null;
        } else {
            await accessService.assertPantry(userId, householdId);
            list = await shoppingListService.createShoppingList({ name: options.name ?? "Meal prep", userId, items: [], householdId });
        }
        const planned = (await this.plan(userId, requests, householdId)).filter((p) => p.toBuy > 0 || p.unconverted.length);
        for (const p of planned) {
            if (p.toBuy > 0) {
                list = await shoppingListService.addItem(list._id!.toString(), { name: p.name, quantity: p.toBuy, unit: p.unit });
            }
            // Stock can't say whether these are covered, so list them as-is.
            for (const u of p.unconverted) {
                list = await shoppingListService.addItem(list._id!.toString(), { name: p.name, quantity: u.quantity, unit: u.unit });
            }
        }
        return list;
    }
};
