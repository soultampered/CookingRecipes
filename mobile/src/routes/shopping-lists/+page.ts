import { listShoppingLists } from '$lib/api/shoppingLists';

export const load = async ({ depends }) => {
	depends('app:shopping-lists');
	return { lists: await listShoppingLists() };
};
