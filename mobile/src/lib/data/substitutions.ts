// STO-78: a static reference dataset, same spirit as STO-18's category lookup but for
// ingredient swaps. Not exhaustive — covers common pantry staples people are most likely to be
// short on mid-recipe. Keys are matched case-insensitively as substrings against the missing
// ingredient's name, so "buttermilk" matches both "Buttermilk" and "cultured buttermilk".
export const SUBSTITUTIONS: Record<string, string> = {
	buttermilk: 'milk + 1 tbsp lemon juice or vinegar (let sit 5 min)',
	'sour cream': 'plain yogurt, or milk + 1 tbsp lemon juice or vinegar',
	'heavy cream': 'milk + melted butter (3:1 ratio)',
	'whole milk': 'milk + a splash of cream, or water + powdered milk',
	egg: 'flax egg (1 tbsp ground flaxseed + 3 tbsp water, rest 5 min) or 1/4 cup unsweetened applesauce',
	'brown sugar': 'white sugar + 1 tbsp molasses per cup',
	'powdered sugar': 'blend white sugar + a little cornstarch in a food processor',
	'cake flour': 'all-purpose flour, remove 2 tbsp per cup and add 2 tbsp cornstarch',
	'self-rising flour': 'all-purpose flour + 1 1/2 tsp baking powder + 1/4 tsp salt per cup',
	'baking powder': 'baking soda + cream of tartar (1:2 ratio)',
	honey: 'sugar + a little water, or maple syrup',
	'maple syrup': 'honey, or dark corn syrup',
	butter: 'neutral oil (use ~3/4 the amount) or margarine',
	'vegetable oil': 'any neutral oil (canola, sunflower) or melted butter',
	'white wine': 'chicken or vegetable broth + a splash of white vinegar',
	'red wine': 'beef broth + a splash of red wine vinegar',
	cornstarch: 'all-purpose flour (use double the amount)',
	'tomato paste': 'ketchup, or tomato sauce reduced down',
	breadcrumbs: 'crushed crackers, oats, or crushed cornflakes',
	mayonnaise: 'plain yogurt or sour cream',
	'cream cheese': 'mascarpone, or plain Greek yogurt strained overnight',
	shallot: 'onion + a little garlic',
	'fresh garlic': 'garlic powder (1/8 tsp per clove)',
	'fresh ginger': 'ground ginger (1/4 tsp per tbsp fresh)',
	'lemon juice': 'lime juice, or vinegar in a pinch',
	'lime juice': 'lemon juice',
	'balsamic vinegar': 'red wine vinegar + a little sugar',
	'worcestershire sauce': 'soy sauce + a splash of vinegar',
	'soy sauce': 'Worcestershire sauce, or salt + a little broth'
};

export function findSubstitution(ingredientName: string): string | undefined {
	const lower = ingredientName.toLowerCase();
	for (const key of Object.keys(SUBSTITUTIONS)) {
		// Word-boundary match, not a plain substring — "egg" as a substring would otherwise
		// also match "eggplant", which isn't the same ingredient at all.
		if (new RegExp(`\\b${key}\\b`).test(lower)) return SUBSTITUTIONS[key];
	}
	return undefined;
}
