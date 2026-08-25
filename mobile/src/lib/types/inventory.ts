// Mirrors src/types/inventory.ts (ObjectId/Date fields become string over the wire)
import type { Unit } from './unit';

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
	'Miscellaneous'
] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export interface Inventory {
	_id: string;
	name: string;
	quantity: number;
	unit: Unit;
	expirationDte?: string;
	createdAt?: string;
	updatedAt?: string;
	category?: InventoryCategory;
	userId: string;
	notes?: string;
	lowStockThreshold?: number;
}

export type NewInventory = Omit<Inventory, '_id' | 'createdAt' | 'updatedAt' | 'userId'>;
