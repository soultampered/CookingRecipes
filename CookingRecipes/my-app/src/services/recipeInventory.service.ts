import { inventoryService} from "./inventory.service.js";
import { recipeService} from "./recipes.service.js";

export const recipeInventoryService = {
    async deductIngredients(recipeId: string) {
        const recipe = await recipeService.getRecipeById(recipeId);

        if (!recipe.ingredients || recipe.ingredients.length === 0) return [];

        const adjustments = recipe.ingredients.map(ingredient => ({
            id: ingredient._id,
            amount: -ingredient.quantity,
        }));
        return inventoryService.bulkAdjust(adjustments);
    },

    async getMissingIngredients(recipeId: string) {
        const recipe = await recipeService.getRecipeById(recipeId);

        const missing: { name: string; needed: number }[] = [];

        for (const ingredient of recipe.ingredients) {
            const stock = await inventoryService.getInventoryById(ingredient._id);
            const available = stock?.quantity ?? 0;

            if (available < ingredient.quantity) {
                missing.push({
                    name: stock?.name ?? "Unknown",
                    needed: ingredient.quantity - available,
                });
            }
        }
        return missing;
    },

    async suggestRecipes() {
        const recipes = await recipeService.getAllRecipes();
        const inventory = await inventoryService.getAllInventory();

        return recipes.filter(recipe =>
            recipe.ingredients.every(ingredient => {
                const stock = inventory.find(i => i._id.toString() === ingredient._id);
                return stock && stock.quantity >= ingredient.quantity;
            })
        );
    },
};
