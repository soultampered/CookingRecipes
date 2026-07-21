// Mirrors api/src/types/shoppingList.ts (ObjectId/Date fields become string over the wire)
export interface ShoppingListItem {
	_id?: string;
	name: string;
	quantity: number;
	checked?: boolean;
	category?: string;
}

export interface ShoppingList {
	_id?: string;
	name: string;
	userId: string;
	createdAt?: string;
	updatedAt?: string;
	items: ShoppingListItem[];
}

export type NewShoppingList = Omit<ShoppingList, '_id' | 'createdAt' | 'updatedAt' | 'userId'>;
