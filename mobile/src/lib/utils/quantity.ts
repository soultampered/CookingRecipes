// STO-20: scaled quantities read as kitchen fractions where it's close, else ≤2 decimals.
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
