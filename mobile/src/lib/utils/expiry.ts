import type { Inventory } from '$lib/types/inventory';

// One definition of "expiring" for inventory and dashboard.
export type ExpiryStatus = 'expired' | 'soon' | 'ok' | 'none';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday(): number {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

// Whole days from today (negative once past). Expiry is stored as UTC midnight, so read UTC parts.
export function daysUntil(iso: string): number {
	const d = new Date(iso);
	const day = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime();
	return Math.round((day - startOfToday()) / DAY_MS);
}

export function expiryStatus(item: Pick<Inventory, 'expirationDte'>, daysAhead: number): ExpiryStatus {
	if (!item.expirationDte) return 'none';
	const days = daysUntil(item.expirationDte);
	if (days < 0) return 'expired';
	if (days <= daysAhead) return 'soon';
	return 'ok';
}

export function expiringItems(items: Inventory[], daysAhead: number): Inventory[] {
	return items
		.filter((i) => {
			const s = expiryStatus(i, daysAhead);
			return s === 'expired' || s === 'soon';
		})
		.sort((a, b) => new Date(a.expirationDte!).getTime() - new Date(b.expirationDte!).getTime());
}
