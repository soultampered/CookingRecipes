import { listInventory } from '$lib/api/inventory';
import { session } from '$lib/state/session.svelte';

export const load = async () => {
	return { inventoryItems: await listInventory({ userId: session.userId ?? undefined }) };
};
