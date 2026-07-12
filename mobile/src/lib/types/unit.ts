// Mirrors src/types/unit.ts
export const UNITS = ['g', 'ml', 'pcs', 'tbsp', 'tsp', 'cup'] as const;
export type Unit = (typeof UNITS)[number];
