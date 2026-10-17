import type { ObjectId } from "mongodb";

// STO-93: quantity change log — the consumption history restock prediction needs.
export type InventoryEventSource = "prepare" | "manual" | "shopping" | "adjust";

export interface InventoryEvent {
    _id?: ObjectId;
    userId: string;
    itemId: string;
    delta: number;
    source: InventoryEventSource;
    at: Date;
}

export interface RestockPrediction {
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
    dailyUse: number;
    daysLeft: number;
    runOutOn: Date;
}
