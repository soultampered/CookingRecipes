import { categorizeItemName } from "./foodCategory.service.js";
import type { InventoryCategory } from "../types/inventory.js";

// STO-23: barcode → product name via Open Food Facts (free, no key). Cached per process;
// misses are cached too so a bad scan doesn't re-hit OFF.
export interface BarcodeProduct {
    code: string;
    name: string;
    brand?: string;
    category: InventoryCategory;
}

const cache = new Map<string, BarcodeProduct | null>();
const MAX_CACHE = 5000;

export const barcodeService = {
    async lookup(code: string): Promise<BarcodeProduct | null> {
        if (cache.has(code)) return cache.get(code)!;
        const res = await fetch(
            `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,generic_name,brands`,
            { headers: { "User-Agent": "Stokpot/1.0 (https://stokpot.ca)" }, signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok && res.status !== 404) throw new Error("LOOKUP_FAILED");
        const body = (await res.json().catch(() => null)) as
            | { status?: number; product?: { product_name?: string; generic_name?: string; brands?: string } }
            | null;
        const p = body?.status === 1 ? body.product : undefined;
        const name = (p?.product_name || p?.generic_name || "").trim();
        const result = name
            ? { code, name, brand: p?.brands?.split(",")[0]?.trim() || undefined, category: await categorizeItemName(name) }
            : null;
        if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
        cache.set(code, result);
        return result;
    }
};
