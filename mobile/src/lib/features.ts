// Mirrors api/src/config/features.ts (CI checks).
export const FEATURE_KEYS = [
	'ratings',
	'unitToggle',
	'expiryAlerts',
	'recipeImport',
	'nutrition',
	'budget',
	'barcode',
	'shareLinks',
	'photos',
	'priceWatch',
	'saferPrepare',
	'mealPlan',
	'mealPrep',
	'restock',
	'households',
	'leftovers',
	'collections',
	'versionHistory',
	'instacart',
	'print',
	'voiceAdd',
	'webEditing'
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
