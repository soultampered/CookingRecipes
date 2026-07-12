import { getRecipe } from '$lib/api/recipes';
import { listInventory } from '$lib/api/inventory';
import { session } from '$lib/state/session.svelte';

export const load = async ({ params }) => {
	const [recipe, inventoryItems] = await Promise.all([
		getRecipe(params.id),
		listInventory({ userId: session.userId ?? undefined })
	]);
	return { recipe, inventoryItems };
};
