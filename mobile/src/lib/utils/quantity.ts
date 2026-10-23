// Kitchen fractions when close, else ≤2 decimals.
const FRACTIONS: [number, string][] = [
	[1 / 8, '⅛'],
	[1 / 4, '¼'],
	[1 / 3, '⅓'],
	[1 / 2, '½'],
	[2 / 3, '⅔'],
	[3 / 4, '¾']
];

export function formatQuantity(n: number): string {
	if (!Number.isFinite(n)) return '';
	const whole = Math.floor(n + 1e-9);
	const frac = n - whole;
	if (frac < 0.01) return String(whole);
	for (const [value, glyph] of FRACTIONS) {
		if (Math.abs(frac - value) < 0.02) return whole ? `${whole}${glyph}` : glyph;
	}
	return String(Math.round(n * 100) / 100);
}

export function roundQuantity(n: number): number {
	return Math.round(n * 1000) / 1000;
}

// 2700 g → 2.7 kg, 1500 ml → 1.5 l.
export function tidyUnit<U extends string>(quantity: number, unit: U): { quantity: number; unit: U | 'kg' | 'l' } {
	if (unit === 'g' && quantity >= 1000) return { quantity: quantity / 1000, unit: 'kg' };
	if (unit === 'ml' && quantity >= 1000) return { quantity: quantity / 1000, unit: 'l' };
	return { quantity, unit };
}

// Converted amounts are approximate: nearest ⅛.
export function formatApprox(n: number): string {
	return formatQuantity(Math.round(n * 8) / 8);
}

// Counted units round up: no half pieces.
export function buyQuantity(n: number, unit: string): number {
	return unit === 'pcs' ? Math.max(0, Math.ceil(n - 1e-9)) : n;
}
