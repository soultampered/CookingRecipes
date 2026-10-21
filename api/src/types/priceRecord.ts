import type { ObjectId } from "mongodb";

// One row per priced item checked off.
export interface PriceRecord {
    _id?: ObjectId;
    userId: string;
    itemKey: string; // normalized name
    itemName: string;
    price: number; // per unit
    store?: string;
    recordedAt: Date;
    // "<listId>:<itemId>": one record per list row, so re-checking updates it.
    source?: string;
}

export interface PriceInsight {
    itemKey: string;
    lastPrice: number;
    lastStore?: string;
    lastAt: Date;
    // Cheapest store by latest price, when >1 store has one.
    cheapestStore?: string;
    cheapestPrice?: number;
    history: { price: number; store?: string; recordedAt: Date }[];
}
