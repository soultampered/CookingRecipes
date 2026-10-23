// Release flags (= GrowthBook keys). Temporary: CI fails once removeAfter <= app version.
// Mirrored in mobile/src/lib/features.ts.
export const FEATURES = {
    ratings: { release: "2.2", removeAfter: "2.3", description: "Recipe favorites and star ratings" },
    unitToggle: { release: "2.2", removeAfter: "2.3", description: "Metric/imperial display toggle" },
    expiryAlerts: { release: "2.2", removeAfter: "2.3", description: "Expiring-soon filter and dashboard card" },
    recipeImport: { release: "2.2", removeAfter: "2.3", description: "Import recipes from websites" },
    nutrition: { release: "2.2", removeAfter: "2.3", description: "Nutrition per serving and daily totals" },
    budget: { release: "2.3", removeAfter: "2.4", description: "Item prices and trip budget on lists" },
    barcode: { release: "2.3", removeAfter: "2.4", description: "Barcode scanning" },
    shareLinks: { release: "2.3", removeAfter: "2.4", description: "Public recipe share links" },
    photos: { release: "2.3", removeAfter: "2.4", description: "Photos on recipes and items" },
    priceWatch: { release: "2.3", removeAfter: "2.4", description: "Price history and cheaper-store hints" },
    saferPrepare: { release: "2.4", removeAfter: "2.5", description: "Scaled, previewable prepare with per-row amounts" },
    mealPlan: { release: "2.4", removeAfter: "2.5", description: "Weekly meal plan" },
    mealPrep: { release: "2.4", removeAfter: "2.5", description: "One combined list for several recipes" },
    restock: { release: "2.4", removeAfter: "2.5", description: "Predictive restock" },
    households: { release: "2.5", removeAfter: "2.6", description: "Pantries, family sharing, shared lists" },
    leftovers: { release: "2.5", removeAfter: "2.6", description: "Save leftovers on prepare" },
    collections: { release: "2.5", removeAfter: "2.6", description: "Recipe collections" },
    versionHistory: { release: "2.5", removeAfter: "2.6", description: "Recipe version history" },
    instacart: { release: "2.6", removeAfter: "2.7", description: "Order a list on Instacart" },
    print: { release: "2.6", removeAfter: "2.7", description: "Print / export a recipe" },
    voiceAdd: { release: "2.6", removeAfter: "2.7", description: "Add items by voice via personal tokens" },
    webEditing: { release: "2.6", removeAfter: "2.7", description: "Web / desktop companion" }
} as const satisfies Record<string, { release: string; removeAfter: string; description: string }>;

export type FeatureKey = keyof typeof FEATURES;
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];
