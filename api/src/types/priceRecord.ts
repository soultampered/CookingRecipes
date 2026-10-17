import type { ObjectId } from "mongodb";

// STO-90: one row each time a priced item is checked off (i.e. bought).
export interface PriceRecord {
    _id?: ObjectId;
    userId: string;
    itemKey: string; // normalized name
    itemName: string;
    price: number; // per unit
    store?: string;
    recordedAt: Date;
}

export interface PriceInsight {
    itemKey: string;
    lastPrice: number;
    lastStore?: string;
    lastAt: Date;
    // Cheapest store by its most recent price, when >1 store has a price.
    cheapestStore?: string;
    cheapestPrice?: number;
    history: { price: number; store?: string; recordedAt: Date }[];
}
