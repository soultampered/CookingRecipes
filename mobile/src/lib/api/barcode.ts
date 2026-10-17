import { apiFetch } from './client';
import type { InventoryCategory } from '$lib/types/inventory';

export interface BarcodeProduct {
	code: string;
	name: string;
	brand?: string;
	category: InventoryCategory;
}

export function lookupBarcode(code: string) {
	return apiFetch<BarcodeProduct>(`/barcode/${encodeURIComponent(code)}`);
}
