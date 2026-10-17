import { listRecipes } from '$lib/api/recipes';
import { listCollections } from '$lib/api/collections';

export const load = async ({ depends }) => {
	depends('app:recipes');
	const [recipes, collections] = await Promise.all([listRecipes(), listCollections().catch(() => [])]);
	return { recipes, collections };
};
