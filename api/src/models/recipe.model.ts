import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../mongo.js';
import type { Recipe, NewRecipe } from '../types/recipe.js';

export const recipeModel = {
    findAll: async (userId: string): Promise<Recipe[]> => {
        const db = await connectToDatabase();
        return db.collection<Recipe>('recipes').find({ userId }).toArray();
    },

    findById: async (id: string): Promise<Recipe> => {
        const db = await connectToDatabase();
        const recipe = await db.collection<Recipe>('recipes').findOne({
            _id: new ObjectId(id)
        });

        if (!recipe) {
            throw new Error(`Recipe with id "${id}" not found`);
        }
        return recipe;
    },

    create: async (data: NewRecipe): Promise<Recipe> => {
        const db = await connectToDatabase();
        const now = new Date();
        // Generated here rather than left to insertOne's auto-generation so `recipe` can be
        // fully typed as Recipe (which requires _id) without a second round-trip to
        // reattach result.insertedId afterward.
        const recipe: Recipe = {
            ...data,
            _id: new ObjectId(),
            createdAt: now,
            updatedAt: now
        };
        await db.collection<Recipe>('recipes').insertOne(recipe);
        return recipe;
    },

    update: async (id: string, data: Partial<Recipe>): Promise<Recipe> => {
        const db = await connectToDatabase();
        const now = new Date();
        const result = await db.collection<Recipe>('recipes').findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...data, updatedAt: now } },
            { returnDocument: 'after' }
        );
        if (!result) {
            throw new Error(`Recipe with id "${id}" not found`);
        }
        return result;
    },

    delete: async (id: string): Promise<boolean> => {
        const db = await connectToDatabase();
        const result = await db.collection<Recipe>('recipes').deleteOne({
            _id: new ObjectId(id)
        });
        return result.deletedCount > 0;
    },

    deleteAllByUserId: async (userId: string): Promise<number> => {
        const db = await connectToDatabase();
        const result = await db.collection<Recipe>('recipes').deleteMany({ userId });
        return result.deletedCount;
    },
};
