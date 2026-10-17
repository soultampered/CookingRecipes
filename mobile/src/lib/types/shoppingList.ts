// Mirrors api/src/types/shoppingList.ts (ObjectId/Date fields become string over the wire)
import type { InventoryCategory } from './inventory';
import type { Unit } from './unit';

export interface ShoppingListItem {
	_id?: string;
	name: string;
	quantity: number;
	checked?: boolean;
	category?: InventoryCategory;
	price?: number | null;
	unit?: Unit;
}

export interface ShoppingList {
	_id?: string;
	name: string;
	userId: string;
	createdAt?: string;
	updatedAt?: string;
	items: ShoppingListItem[];
	budget?: number | null;
	store?: string | null;
}

export type NewShoppingList = Omit<ShoppingList, '_id' | 'createdAt' | 'updatedAt' | 'userId'>;
