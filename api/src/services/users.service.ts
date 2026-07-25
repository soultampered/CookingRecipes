import { userModel, stripPassword } from "../models/user.model.js";
import { recipeModel } from "../models/recipe.model.js";
import { inventoryModel } from "../models/inventory.model.js";
import { shoppingListModel } from "../models/shoppingList.model.js";
import type { User } from "../types/user.js"

export const usersService = {
    async getUserById(id: string) {
        const user = await userModel.findById(id);
        if (!user) throw new Error("NOT_FOUND");
        return stripPassword(user);
    },

    async updateUser(id: string, data: Partial<User>) {
        const updated = await userModel.update(id, data);
        if (!updated) throw new Error("User not updated");
        return stripPassword(updated);
    },

    async deleteUser(id: string) {
        // Account deletion must remove all of a user's data, not just their login —
        // recipes/inventory/shopping lists otherwise stay orphaned in the database
        // under a userId that no longer resolves to anyone.
        await Promise.all([
            recipeModel.deleteAllByUserId(id),
            inventoryModel.deleteAllByUserId(id),
            shoppingListModel.deleteAllByUserId(id),
        ]);
        const deleted = await userModel.delete(id);
        if (!deleted) throw new Error("Could not delete user")
        return true;
    },

}