import { preparationModel } from "../models/preparation.model.js";
import type { NutritionFacts, Recipe } from "../types/recipe.js";

const MACROS = ["calories", "protein", "carbs", "fat"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface NutritionDay {
    date: string; // YYYY-MM-DD in the caller's local time
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    preparations: { recipeTitle: string; servings: number }[];
}

function round(n: number) {
    return Math.round(n * 10) / 10;
}

// nutrition[0] is per serving (STO-22 convention); recipes without servings count as 1.
export function servingsMade(recipe: Recipe, scale: number): number {
    return round((recipe.servings ?? 1) * scale);
}

export const nutritionService = {
    async logPreparation(userId: string, recipe: Recipe, scale: number): Promise<void> {
        const perServing = recipe.nutrition?.[0] ?? {};
        const servings = servingsMade(recipe, scale);
        const nutrition: NutritionFacts = {};
        for (const key of MACROS) {
            if (typeof perServing[key] === "number") nutrition[key] = round(perServing[key]! * servings);
        }
        try {
            await preparationModel.create({
                userId,
                recipeId: recipe._id.toString(),
                recipeTitle: recipe.title,
                servings,
                nutrition,
                preparedAt: new Date()
            });
        } catch (err) {
            // The inventory deduction already happened; a lost log row isn't worth failing it.
            console.error("Failed to log preparation:", err);
        }
    },

    // tzOffsetMinutes is JS getTimezoneOffset() from the client (UTC − local, in minutes).
    async summary(userId: string, days: number, tzOffsetMinutes: number): Promise<NutritionDay[]> {
        const offsetMs = tzOffsetMinutes * 60 * 1000;
        const localToday = new Date(Date.now() - offsetMs);
        localToday.setUTCHours(0, 0, 0, 0);
        const startLocal = localToday.getTime() - (days - 1) * DAY_MS;
        const rows = await preparationModel.findSince(userId, new Date(startLocal + offsetMs));

        const byDate = new Map<string, NutritionDay>();
        for (let i = 0; i < days; i++) {
            const date = new Date(startLocal + i * DAY_MS).toISOString().slice(0, 10);
            byDate.set(date, { date, calories: 0, protein: 0, carbs: 0, fat: 0, preparations: [] });
        }
        for (const row of rows) {
            const date = new Date(row.preparedAt.getTime() - offsetMs).toISOString().slice(0, 10);
            const day = byDate.get(date);
            if (!day) continue;
            for (const key of MACROS) day[key] = round(day[key] + (row.nutrition[key] ?? 0));
            day.preparations.push({ recipeTitle: row.recipeTitle, servings: row.servings });
        }
        return [...byDate.values()];
    }
};
