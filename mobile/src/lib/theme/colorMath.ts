function hexToRgb(hex: string): [number, number, number] {
	const n = parseInt(hex.replace('#', ''), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
	return (
		'#' +
		[r, g, b]
			.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
			.join('')
	);
}

/** Blends two hex colors — `weight` is how much of `hexB` to mix in (0 = pure hexA, 1 = pure hexB). */
export function mix(hexA: string, hexB: string, weight: number): string {
	const a = hexToRgb(hexA);
	const b = hexToRgb(hexB);
	return rgbToHex([
		a[0] + (b[0] - a[0]) * weight,
		a[1] + (b[1] - a[1]) * weight,
		a[2] + (b[2] - a[2]) * weight
	]);
}

/** Lightens a hex color by a flat per-channel amount (used for dark-mode "raised" surfaces). */
export function lighten(hex: string, amount: number): string {
	const [r, g, b] = hexToRgb(hex);
	return rgbToHex([r + amount, g + amount, b + amount]);
}
