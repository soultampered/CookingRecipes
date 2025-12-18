import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../mongo.js';
import type { Recipe } from '../types/recipe.js';

export const recipeModel = {
    findAll: async (): Promise<Recipe[]> => {
        const db = await connectToDatabase();
        return db.collection<Recipe>('recipes').find().toArray();
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

    create: async (data: Recipe): Promise<Recipe> => {
        const db = await connectToDatabase();
        const now = new Date();
        const recipe: Recipe = {
            ...data,
            createdAt: now,
            updatedAt: now
        };
        const result = await db.collection<Recipe>('recipes').insertOne(recipe);
        return { ...recipe, _id: result.insertedId };
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
};
