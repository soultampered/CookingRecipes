import { listRecipes } from '$lib/api/recipes';

export const load = async ({ depends }) => {
	depends('app:recipes');
	return { recipes: await listRecipes() };
};
