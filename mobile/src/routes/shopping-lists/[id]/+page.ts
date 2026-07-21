import { getShoppingList } from '$lib/api/shoppingLists';

export const load = async ({ params, depends }) => {
	depends(`app:shopping-list:${params.id}`);
	return { list: await getShoppingList(params.id) };
};
