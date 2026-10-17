import { apiFetch } from './client';

// STO-90
export interface PriceInsight {
	itemKey: string;
	lastPrice: number;
	lastStore?: string;
	lastAt: string;
	cheapestStore?: string;
	cheapestPrice?: number;
	history: { price: number; store?: string; recordedAt: string }[];
}

export function priceKey(name: string) {
	return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getPriceInsights(names: string[]) {
	if (!names.length) return Promise.resolve({} as Record<string, PriceInsight>);
	const params = new URLSearchParams();
	for (const n of names) params.append('names', n);
	return apiFetch<Record<string, PriceInsight>>(`/prices/insights?${params}`);
}
