// Local calendar-day helpers (YYYY-MM-DD).
export function toLocalISODate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function fromLocalISODate(s: string): Date {
	const [y, m, d] = s.split('-').map(Number);
	return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
	const copy = new Date(d);
	copy.setDate(copy.getDate() + n);
	return copy;
}

// Weeks start Monday.
export function startOfWeek(d: Date): Date {
	const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	const offset = (copy.getDay() + 6) % 7;
	return addDays(copy, -offset);
}
