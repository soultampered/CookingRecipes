import type { Unit } from "../types/unit.js";

// Mirrors mobile/src/lib/utils/unitConversion.ts (STO-92). US customary volumes.
const MASS: Partial<Record<Unit, number>> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
const VOLUME: Partial<Record<Unit, number>> = {
    ml: 1,
    l: 1000,
    tsp: 4.92892,
    tbsp: 14.7868,
    cup: 236.588,
    "fl oz": 29.5735,
    pint: 473.176,
    quart: 946.353,
    gallon: 3785.41
};

export function convert(quantity: number, from: Unit, to: Unit): number | null {
    if (from === to) return quantity;
    const table = from in MASS && to in MASS ? MASS : from in VOLUME && to in VOLUME ? VOLUME : null;
    if (!table) return null;
    return (quantity * table[from]!) / table[to]!;
}
