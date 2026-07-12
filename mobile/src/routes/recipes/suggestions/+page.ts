import { getSuggestions } from '$lib/api/recipes';

export const load = async () => {
	return { recipes: await getSuggestions() };
};
