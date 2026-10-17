import type {ObjectId} from "mongodb";
import type { Unit } from "./unit.js"

export const INVENTORY_CATEGORIES = [
    'Produce',
    'Meat & Poultry',
    'Seafood',
    'Dairy',
    'Eggs',
    'Grains & Pasta',
    'Bakery',
    'Baking',
    'Spices & Seasonings',
    'Canned & Jarred',
    'Frozen',
    'Snacks',
    'Condiments',
    'Oils & Fats',
    'Beverages',
    'Leftovers',
    'Miscellaneous',
] as const;
export type InventoryCategory = typeof INVENTORY_CATEGORIES[number];

export interface Inventory {
    _id: ObjectId;
    name: string;
    quantity: number;
    unit: Unit;
    expirationDte?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    category?: InventoryCategory;
    userId: string;
    notes?: string;
    lowStockThreshold?: number;
    // STO-86: set on leftovers created by Prepare.
    leftoverOfRecipeId?: string;
    photoId?: string | null; // STO-19
    householdId?: string | null; // STO-88: null/absent = personal pantry
}

export interface InventoryAdjustment {
    id: string;
    amount: number;
}

// Thrown by inventoryService.applyAdjustments; carries which items blocked it.
export class InventoryAdjustError extends Error {
    constructor(code: "INSUFFICIENT_STOCK" | "INGREDIENT_NOT_FOUND" | "FORBIDDEN", public itemIds: string[]) {
        super(code);
    }
}

export type NewInventory = Omit<Inventory, "_id" | "createdAt" | "updatedAt">;