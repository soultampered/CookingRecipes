import { priceRecordModel } from "../models/priceRecord.model.js";
import type { PriceInsight } from "../types/priceRecord.js";

export function itemKey(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function storeKey(store?: string | null): string | undefined {
    const s = store?.trim();
    return s ? s : undefined;
}

export const priceHistoryService = {
    async record(userId: string, itemName: string, price: number, store?: string | null): Promise<void> {
        try {
            await priceRecordModel.create({
                userId,
                itemKey: itemKey(itemName),
                itemName,
                price,
                store: storeKey(store),
                recordedAt: new Date()
            });
        } catch (err) {
            // Same stance as the inventory sync on check: never fail the toggle over it.
            console.error("Failed to record price:", err);
        }
    },

    async insights(userId: string, names: string[]): Promise<Record<string, PriceInsight>> {
        const keys = [...new Set(names.map(itemKey))].slice(0, 200);
        const rows = await priceRecordModel.findByKeys(userId, keys);
        const out: Record<string, PriceInsight> = {};
        for (const key of keys) {
            const mine = rows.filter((r) => r.itemKey === key); // newest first
            if (!mine.length) continue;
            const latestByStore = new Map<string, number>();
            for (const r of mine) if (r.store && !latestByStore.has(r.store)) latestByStore.set(r.store, r.price);
            let cheapestStore: string | undefined;
            let cheapestPrice: number | undefined;
            if (latestByStore.size > 1) {
                for (const [store, price] of latestByStore) {
                    if (cheapestPrice === undefined || price < cheapestPrice) {
                        cheapestStore = store;
                        cheapestPrice = price;
                    }
                }
            }
            out[key] = {
                itemKey: key,
                lastPrice: mine[0].price,
                lastStore: mine[0].store,
                lastAt: mine[0].recordedAt,
                cheapestStore,
                cheapestPrice,
                history: mine.slice(0, 10).map((r) => ({ price: r.price, store: r.store, recordedAt: r.recordedAt }))
            };
        }
        return out;
    },

    // Price to prefill when adding an item: last paid at this store, else last paid anywhere.
    async suggestedPrice(userId: string, itemName: string, store?: string | null): Promise<number | undefined> {
        const rows = await priceRecordModel.findByKeys(userId, [itemKey(itemName)]);
        const atStore = storeKey(store) ? rows.find((r) => r.store === storeKey(store)) : undefined;
        return (atStore ?? rows[0])?.price;
    }
};
