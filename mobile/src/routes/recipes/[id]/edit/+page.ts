import { getRecipe } from '$lib/api/recipes';
import { getInventoryItem, listInventory } from '$lib/api/inventory';
import type { Inventory } from '$lib/types/inventory';

export const load = async ({ params }) => {
	const [recipe, ownInventory] = await Promise.all([getRecipe(params.id), listInventory()]);

	// Recipes are global and can reference another user's inventory item. The picker only
	// offers the current user's own items to choose from, but an existing ingredient
	// referencing someone else's item still needs a matching <option> — otherwise the
	// <select> silently falls back to whatever's first in the list and submitting the form
	// unchanged would corrupt that ingredient to a different item. Resolve any missing ones
	// and merge them in so they render (and round-trip) correctly if left untouched.
	const ownIds = new Set(ownInventory.map((i) => i._id));
	const missingIds = [...new Set(recipe.ingredients.map((i) => i.inventoryItemId))].filter(
		(id) => !ownIds.has(id)
	);
	const resolved = await Promise.allSettled(missingIds.map((id) => getInventoryItem(id)));
	const extraItems: Inventory[] = resolved
		.filter((r): r is PromiseFulfilledResult<Inventory> => r.status === 'fulfilled')
		.map((r) => r.value);

	return { recipe, inventoryItems: [...ownInventory, ...extraItems] };
};
