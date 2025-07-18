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

export type Unit = "g" | "ml" | "pcs" | "tbsp" | "tsp" | "cup";
export interface InventoryItem {
    _id: string;
    name: string;
    quantity: number;
    unit: Unit;
    expirationDte?: Date;
    category?: InventoryCategory;
    userId: string;
    notes?: string;
}