import type {ObjectId} from "mongodb";
import type { Unit } from "./unit.js"

export const INVENTORY_CATEGORIES = [
    'Produce',
    'Meat & Poultry',
    'Seafood',
    'Dairy',
    'Eggs',
    'Grains & Pasta',
    'Baking',
    'Spices & Seasonings',
    'Canned & Jarred',
    'Frozen',
    'Snacks',
    'Condiments',
    'Oils & Fats',
    'Beverages',
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
}

export interface InventoryAdjustment {
    id: string;
    amount: number;
}