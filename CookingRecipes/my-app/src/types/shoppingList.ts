export interface ShoppingListItem {
    _id?: string; // reference to inventory item or unique list item id
    name: string;
    quantity: number;
    checked?: boolean; // for UI tracking (e.g. "purchased" or "acquired")
    category?: string; // optional grouping (produce, dairy, etc.)
}

export interface ShoppingList {
    _id?: string;
    name: string;
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
    items: ShoppingListItem[];
}
