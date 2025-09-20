import { connectToDatabase } from "../mongo.js";
import type { Recipe } from "../types/recipe.js";
import { ObjectId } from "mongodb";

const COLLECTION_NAME = 'recipes';

export class recipeModel {
    static async getCollection() {
        const db = await connectToDatabase();
        return db.collection<Recipe>(COLLECTION_NAME);
    }

    static async findAll(): Promise<Recipe[]> {
        const collection = await this.getCollection();
        return collection.find().toArray();
    }

    static async findById(id: string): Promise<Recipe | null> {
        const collection = await this.getCollection();
        return collection.findOne({ _id: new ObjectId(id) });
    }

    static async create(recipe: Recipe): Promise<Recipe> {
        const collection = await this.getCollection();
        const result = await collection.insertOne(recipe);
        return { ...recipe, _id: result.insertedId } as Recipe;
    }

    static async update(id: string, recipe: Partial<Recipe>): Promise<boolean> {
        const collection = await this.getCollection();
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: recipe }
        );
        return result.modifiedCount > 0;
    }

    static async delete(id: string): Promise<boolean> {
        const collection = await this.getCollection();
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
    }
}