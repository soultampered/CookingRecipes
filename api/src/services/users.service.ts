import { userModel, stripPassword } from "../models/user.model.js";
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
        const deleted = await userModel.delete(id);
        if (!deleted) throw new Error("Could not delete user")
        return true;
    },

}