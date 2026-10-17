import { Hono } from "hono";
import type { User } from "../types/user.js";
import { usersService } from "../services/users.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { validateJson } from "../middleware/validate.middleware.js";
import { patchUserSchema } from "../schemas/user.schema.js";

const usersRoute = new Hono<{ Variables: AuthVariables }>();

// Self-editable profile fields only. Security-relevant fields (emailVerified,
// mustResetPassword, refreshTokens, password, _id, ...) must never be settable
// through this endpoint — they have their own controlled flows elsewhere.
const PATCHABLE_USER_FIELDS = ["displayName", "avatarUrl", "bio", "preferences"] as const;

function pickPatchableFields(body: Partial<User>): Partial<User> {
    const result: Partial<User> = {};
    for (const field of PATCHABLE_USER_FIELDS) {
        if (field in body) {
            (result as Record<string, unknown>)[field] = body[field];
        }
    }
    return result;
}

usersRoute.use('*', authMiddleware);

usersRoute.get('/:id', requireVerified, async (c) => {
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

usersRoute.patch('/:id', requireVerified, validateJson(patchUserSchema), async (c) => {
    if (c.get('userId') !== c.req.param('id')) {
        return c.json({ error: 'Forbidden' }, 403);
    }
    try {
        const userId = c.req.param('id');
        const body = c.req.valid('json');
        const updatedUser = await usersService.updateUser(userId, pickPatchableFields(body));
        return c.json(updatedUser, 200);
    } catch (err) {
        if ((err as Error).message === "NOT_FOUND") {
            return c.json({ error: "User not found"}, 404);
        }
        return c.json({ error: "Failed to update user" }, 500);
    }
});

usersRoute.get('/:id/export', requireVerified, async (c) => {
    if (c.get('userId') !== c.req.param('id')) {
        return c.json({ error: 'Forbidden' }, 403);
    }
    try {
        const data = await usersService.exportUser(c.req.param('id'));
        const date = new Date().toISOString().slice(0, 10);
        c.header('Content-Disposition', `attachment; filename="stokpot-export-${date}.json"`);
        return c.json(data, 200);
    } catch {
        return c.json({ error: 'Failed to export data' }, 500);
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
