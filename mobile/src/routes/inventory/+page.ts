import { listInventory } from '$lib/api/inventory';
import { session } from '$lib/state/session.svelte';
import type { InventoryCategory } from '$lib/types/inventory';

export const load = async ({ url, depends }) => {
	depends('app:inventory');
	const category = (url.searchParams.get('category') as InventoryCategory | null) ?? undefined;
	return {
		items: await listInventory({ userId: session.userId ?? undefined, category }),
		category: category ?? null
	};
};
