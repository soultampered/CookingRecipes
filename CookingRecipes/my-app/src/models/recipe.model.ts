import { connectToDatabase } from "../mongo.js";
import type { Recipe } from "../types/recipe.js";
import type { Collection } from "mongodb";

export async function getRecipeCollection(): Promise<Collection<Recipe>> {
    const db = await connectToDatabase();
    return db.collection<Recipe>("recipes");
}
