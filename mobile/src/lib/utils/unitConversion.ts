import type { Unit } from '$lib/types/unit';

// US customary volumes. Base units: g, ml.
const MASS: Partial<Record<Unit, number>> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
const VOLUME: Partial<Record<Unit, number>> = {
	ml: 1,
	l: 1000,
	tsp: 4.92892,
	tbsp: 14.7868,
	cup: 236.588,
	'fl oz': 29.5735,
	pint: 473.176,
	quart: 946.353,
	gallon: 3785.41
};

export type UnitSystem = 'original' | 'metric' | 'imperial';

function dimension(unit: Unit): 'mass' | 'volume' | null {
	if (unit in MASS) return 'mass';
	if (unit in VOLUME) return 'volume';
	return null;
}

// null when the units differ in kind (cup → g, pcs).
export function convert(quantity: number, from: Unit, to: Unit): number | null {
	if (from === to) return quantity;
	const d = dimension(from);
	if (!d || d !== dimension(to)) return null;
	const table = d === 'mass' ? MASS : VOLUME;
	return (quantity * table[from]!) / table[to]!;
}

// Readable unit in the target system (display only).
export function toSystem(quantity: number, unit: Unit, system: UnitSystem): { quantity: number; unit: Unit } {
	const d = dimension(unit);
	if (system === 'original' || !d) return { quantity, unit };
	const base = quantity * (d === 'mass' ? MASS : VOLUME)[unit]!;
	let target: Unit;
	if (system === 'metric') {
		target = d === 'mass' ? (base >= 1000 ? 'kg' : 'g') : base >= 1000 ? 'l' : 'ml';
	} else if (d === 'mass') {
		target = base >= MASS.lb! ? 'lb' : 'oz';
	} else {
		target =
			base < VOLUME.tbsp! ? 'tsp' : base < VOLUME.cup! / 4 ? 'tbsp' : base < VOLUME.quart! ? 'cup' : base < VOLUME.gallon! ? 'quart' : 'gallon';
	}
	const converted = base / (d === 'mass' ? MASS : VOLUME)[target]!;
	// Metric reads better without fiddly decimals.
	const rounded = system === 'metric' && (target === 'g' || target === 'ml') ? Math.round(converted) : converted;
	return { quantity: rounded, unit: target };
}
