import { connectToDatabase } from "../mongo";
import type { Recipe } from "../types/recipes.ts";
import type { Collection } from "mongodb";

export async function getRecipeCollection(): Promise<Collection<Recipe>> {
    const db = await connectToDatabase();
    return db.collection<Recipe>("recipes");
}
