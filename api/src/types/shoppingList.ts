import type {ObjectId} from "mongodb";
import type { InventoryCategory } from "./inventory.js";

export interface ShoppingListItem {
    _id?: ObjectId; // reference to inventory item or unique list item id
    name: string;
    quantity: number;
    checked?: boolean; // for UI tracking (e.g. "purchased" or "acquired")
    category?: InventoryCategory; // shares inventory's category vocabulary
    price?: number | null; // STO-81: per unit of quantity
}

export interface ShoppingList {
    _id?: ObjectId;
    name: string;
    userId: string;
    createdAt?: Date;
    updatedAt?: Date;
    items: ShoppingListItem[];
    budget?: number | null; // STO-81
    store?: string | null; // STO-90: where this trip is
}

export type NewShoppingList = Omit<
    ShoppingList,
    "_id" | "createdAt" | "updatedAt"
>;
