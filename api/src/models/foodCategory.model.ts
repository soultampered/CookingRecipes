import { connectToDatabase } from "../mongo.js";
import { FOOD_CATEGORY_SEED, FOOD_CATEGORY_KEYWORD_SEED } from "../data/foodCategoriesSeed.js";
import type { FoodCategoryEntry, FoodCategoryKeywordHint } from "../data/foodCategoriesSeed.js";

export const foodCategoryModel = {
    findAllEntries: async (): Promise<FoodCategoryEntry[]> => {
        const db = await connectToDatabase();
        return db.collection<FoodCategoryEntry>("foodCategories").find().toArray();
    },

    findAllKeywordHints: async (): Promise<FoodCategoryKeywordHint[]> => {
        const db = await connectToDatabase();
        return db
            .collection<FoodCategoryKeywordHint>("foodCategoryKeywords")
            .find()
            .sort({ order: 1 })
            .toArray();
    },

    // Idempotent — only inserts the seed data the first time either collection is empty, so
    // this is safe to call on every server boot without duplicating or resetting entries an
    // admin may have added/edited directly in Mongo since.
    ensureSeeded: async (): Promise<void> => {
        const db = await connectToDatabase();
        const entries = db.collection<FoodCategoryEntry>("foodCategories");
        const keywords = db.collection<FoodCategoryKeywordHint>("foodCategoryKeywords");

        if ((await entries.countDocuments()) === 0) {
            await entries.insertMany(FOOD_CATEGORY_SEED);
            await entries.createIndex({ name: 1 }, { unique: true });
        }
        if ((await keywords.countDocuments()) === 0) {
            await keywords.insertMany(FOOD_CATEGORY_KEYWORD_SEED);
        }
    }
};
