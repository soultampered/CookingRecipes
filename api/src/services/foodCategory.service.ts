import { foodCategoryModel } from "../models/foodCategory.model.js";
import type { InventoryCategory } from "../types/inventory.js";
import type { FoodCategoryKeywordHint } from "../data/foodCategoriesSeed.js";

let exactMap: Map<string, InventoryCategory> | null = null;
let keywordHints: FoodCategoryKeywordHint[] | null = null;
let loading: Promise<void> | null = null;

// Loaded once per server process and cached in memory — every add-item call would otherwise
// cost a Mongo round trip. The DB collections only need to be re-read after a restart, or via
// invalidateCache() below if something edits them live and needs the running server to notice.
async function ensureLoaded(): Promise<void> {
    if (exactMap && keywordHints) return;
    if (!loading) {
        loading = (async () => {
            await foodCategoryModel.ensureSeeded();
            const [entries, hints] = await Promise.all([
                foodCategoryModel.findAllEntries(),
                foodCategoryModel.findAllKeywordHints()
            ]);
            exactMap = new Map(entries.map((e) => [e.name, e.category]));
            keywordHints = hints;
        })();
    }
    await loading;
}

function normalize(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function categorizeItemName(name: string): Promise<InventoryCategory> {
    await ensureLoaded();
    const normalized = normalize(name);

    const exact = exactMap!.get(normalized);
    if (exact) return exact;

    // Strip a trailing "s" for a cheap singular/plural match (e.g. "carrots" -> "carrot").
    if (normalized.endsWith("s")) {
        const singular = exactMap!.get(normalized.slice(0, -1));
        if (singular) return singular;
    }

    for (const hint of keywordHints!) {
        if (normalized.includes(hint.keyword)) return hint.category;
    }

    return "Miscellaneous";
}

// Exposed for a future admin/edit flow — forces the next categorizeItemName call to re-read
// from Mongo instead of serving the stale in-memory cache.
export function invalidateFoodCategoryCache(): void {
    exactMap = null;
    keywordHints = null;
    loading = null;
}
