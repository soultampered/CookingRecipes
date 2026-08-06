// Mirrors src/types/unit.ts
export const UNITS = [
	'g',
	'kg',
	'oz',
	'lb',
	'ml',
	'l',
	'tsp',
	'tbsp',
	'cup',
	'fl oz',
	'pint',
	'quart',
	'gallon',
	'pinch',
	'dash',
	'pcs'
] as const;
export type Unit = (typeof UNITS)[number];
