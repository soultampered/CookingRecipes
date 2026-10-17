import { getRecipe, listRevisions } from '$lib/api/recipes';

export const load = async ({ params, depends }) => {
	depends(`app:recipe-history:${params.id}`);
	const [recipe, revisions] = await Promise.all([getRecipe(params.id), listRevisions(params.id)]);
	return { recipe, revisions };
};
