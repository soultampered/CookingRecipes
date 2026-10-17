import { listShoppingLists } from '$lib/api/shoppingLists';
import { activePantry, pantryRestored } from '$lib/state/activePantry.svelte';

export const load = async ({ depends }) => {
	depends('app:shopping-lists');
	depends('app:pantry');
	await pantryRestored;
	return { lists: await listShoppingLists(activePantry.current) };
};
