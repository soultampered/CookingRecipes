import { Hono } from "hono";
import type { User } from "../types/user.js";
import { usersService } from "../services/users.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";

const usersRoute = new Hono<{ Variables: AuthVariables }>();

usersRoute.use('*', authMiddleware);

usersRoute.get('/:id', async (c) => {
    if (c.get('userId') !== c.req.param('id')) {
        return c.json({ error: 'Forbidden' }, 403);
    }
    try {
        const userId = c.req.param('id');
        const user = await usersService.getUserById(userId);
        return c.json(user, 200)
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({ error: "User not found" }, 404);
        }
        return c.json({ error: "Failed to fetch user" }, 500);
    }
});

usersRoute.patch('/:id', async (c) => {
    if (c.get('userId') !== c.req.param('id')) {
        return c.json({ error: 'Forbidden' }, 403);
    }
    try {
        const userId = c.req.param('id');
        const body = await c.req.json<Partial<User>>();
        const updatedUser = await usersService.updateUser(userId, body);
        return c.json(updatedUser, 200);
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({ error: "User not found"}, 404);
        }
        return c.json({ error: "Failed to update user" }, 500);
    }
});

usersRoute.delete('/:id', async (c) => {
    if (c.get('userId') !== c.req.param('id')) {
        return c.json({ error: 'Forbidden' }, 403);
    }
    try{
        const userId = c.req.param("id");
        await usersService.deleteUser(userId);
        return c.body(null, 204);
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({ error: "User not found" }, 404);
        }
        return c.json({ error: "Failed to delete user" }, 500);
    }
});

export default usersRoute;
