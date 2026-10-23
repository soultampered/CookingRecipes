import type {ObjectId} from "mongodb";
import type { InventoryCategory } from "./inventory.js";
import type { Unit } from "./unit.js";

export interface ShoppingListItem {
    _id?: ObjectId; // reference to inventory item or unique list item id
    name: string;
    quantity: number;
    checked?: boolean; // for UI tracking (e.g. "purchased" or "acquired")
    category?: InventoryCategory; // shares inventory's category vocabulary
    price?: number | null; // per unit
    unit?: Unit; // set when generated from recipes; absent = count
}

export interface ShoppingList {
    _id?: ObjectId;
    name: string;
    userId: string;
    createdAt?: Date;
    updatedAt?: Date;
    items: ShoppingListItem[];
    budget?: number | null;
    store?: string | null; // this trip's store
    householdId?: string | null;
}

export type NewShoppingList = Omit<
    ShoppingList,
    "_id" | "createdAt" | "updatedAt"
>;
