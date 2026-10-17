import { Hono, type Context } from "hono";
import { recipeCollectionService } from "../services/recipeCollection.service.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/requireVerified.middleware.js";
import { validateJson } from "../middleware/validate.middleware.js";
import {
    createRecipeCollectionSchema,
    updateRecipeCollectionSchema,
    collectionRecipeSchema
} from "../schemas/recipeCollection.schema.js";

const collectionRoute = new Hono<{ Variables: AuthVariables }>();

collectionRoute.use("*", authMiddleware);
collectionRoute.use("*", requireVerified);

function fail(c: Context, err: unknown) {
    const message = (err as Error).message;
    if (message === "NOT_FOUND") return c.json({ error: "Collection not found" }, 404);
    if (message === "FORBIDDEN") return c.json({ error: "Forbidden" }, 403);
    if (message === "UNKNOWN_RECIPE") return c.json({ error: "Recipe not found" }, 404);
    return c.json({ error: "Failed to update collection" }, 500);
}

collectionRoute.get("/", async (c) => {
    return c.json(await recipeCollectionService.list(c.get("userId")), 200);
});

collectionRoute.post("/", validateJson(createRecipeCollectionSchema), async (c) => {
    return c.json(await recipeCollectionService.create(c.get("userId"), c.req.valid("json").name), 201);
});

collectionRoute.patch("/:id", validateJson(updateRecipeCollectionSchema), async (c) => {
    try {
        return c.json(await recipeCollectionService.update(c.req.param("id"), c.get("userId"), c.req.valid("json")), 200);
    } catch (err) {
        return fail(c, err);
    }
});

collectionRoute.delete("/:id", async (c) => {
    try {
        await recipeCollectionService.remove(c.req.param("id"), c.get("userId"));
        return c.body(null, 204);
    } catch (err) {
        return fail(c, err);
    }
});

collectionRoute.post("/:id/recipes", validateJson(collectionRecipeSchema), async (c) => {
    try {
        const { recipeId } = c.req.valid("json");
        return c.json(await recipeCollectionService.addRecipe(c.req.param("id"), c.get("userId"), recipeId), 200);
    } catch (err) {
        return fail(c, err);
    }
});

collectionRoute.delete("/:id/recipes/:recipeId", async (c) => {
    try {
        return c.json(
            await recipeCollectionService.removeRecipe(c.req.param("id"), c.get("userId"), c.req.param("recipeId")),
            200
        );
    } catch (err) {
        return fail(c, err);
    }
});

export default collectionRoute;
