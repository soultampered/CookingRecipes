import type {ObjectId} from "mongodb";

export interface ShoppingListItem {
    _id?: ObjectId; // reference to inventory item or unique list item id
    name: string;
    quantity: number;
    checked?: boolean; // for UI tracking (e.g. "purchased" or "acquired")
    category?: string; // optional grouping (produce, dairy, etc.)
}

export interface ShoppingList {
    _id?: ObjectId;
    name: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    items: ShoppingListItem[];
}

export type NewShoppingList = Omit<
    ShoppingList,
    "_id" | "createdAt" | "updatedAt"
>;
