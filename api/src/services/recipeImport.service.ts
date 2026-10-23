import { safeFetch } from "./safeFetch.js";
import { parseIngredient } from "./ingredientParser.js";
import { inventoryModel } from "../models/inventory.model.js";
import { inventoryService } from "./inventory.service.js";
import { recipeService } from "./recipes.service.js";
import { photoService } from "./photo.service.js";
import type { Recipe, RecipeIngredient } from "../types/recipe.js";

// Imports schema.org Recipe JSON-LD; Pinterest pins are followed to their source.
const MAX_HTML = 3 * 1024 * 1024;

type Json = Record<string, unknown>;

function asArray<T>(v: T | T[] | undefined | null): T[] {
    return v == null ? [] : Array.isArray(v) ? v : [v];
}

function isRecipe(node: Json): boolean {
    return asArray(node["@type"] as string | string[]).some((t) => String(t).toLowerCase() === "recipe");
}

function findRecipe(node: unknown): Json | null {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
        for (const n of node) {
            const found = findRecipe(n);
            if (found) return found;
        }
        return null;
    }
    const obj = node as Json;
    if (isRecipe(obj)) return obj;
    return findRecipe(obj["@graph"]) ?? findRecipe(obj["mainEntity"]);
}

function decodeEntities(s: string): string {
    return s
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&#039;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/\s+/g, " ")
        .trim();
}

export function extractJsonLdRecipe(html: string): Json | null {
    const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    for (const m of html.matchAll(re)) {
        try {
            const found = findRecipe(JSON.parse(m[1].trim()));
            if (found) return found;
        } catch {
            // some sites ship invalid JSON-LD blocks next to valid ones
        }
    }
    return null;
}

// ISO-8601 duration "PT1H30M" → 90
function minutes(v: unknown): number | undefined {
    const m = typeof v === "string" ? v.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i) : null;
    if (!m) return undefined;
    const total = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
    return total || undefined;
}

function instructions(v: unknown): string[] {
    const out: string[] = [];
    for (const item of asArray(v as unknown)) {
        if (typeof item === "string") out.push(...item.split(/\n+/));
        else if (item && typeof item === "object") {
            const o = item as Json;
            if (o.itemListElement) out.push(...instructions(o.itemListElement));
            else if (typeof o.text === "string") out.push(o.text);
            else if (typeof o.name === "string") out.push(o.name);
        }
    }
    return out.map(decodeEntities).filter(Boolean).slice(0, 100);
}

function firstNumber(v: unknown): number | undefined {
    for (const item of asArray(v as unknown)) {
        const n = Number(String(item).match(/\d+(\.\d+)?/)?.[0]);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return undefined;
}

function imageUrl(v: unknown): string | undefined {
    for (const item of asArray(v as unknown)) {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && typeof (item as Json).url === "string") return (item as Json).url as string;
    }
    return undefined;
}

// Pins rarely hold the recipe; find the source link.
function pinterestSource(html: string): string | null {
    const candidates = [
        ...html.matchAll(/"link"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/g),
        ...html.matchAll(/<meta[^>]+property=["']og:see_also["'][^>]+content=["']([^"']+)["']/gi)
    ].map((m) => m[1].replace(/\\\//g, "/"));
    return candidates.find((u) => !/pinterest\.|pinimg\.com|pin\.it/i.test(u)) ?? null;
}

// A pin is followed once, so a self-linking pin can't loop.
async function fetchRecipeJson(url: string, pinHops = 0): Promise<{ recipe: Json; source: URL }> {
    const page = await safeFetch(url, MAX_HTML, "text/html,application/xhtml+xml");
    const html = page.body.toString("utf8");
    let recipe = extractJsonLdRecipe(html);
    if (!recipe && /(^|\.)pinterest\.|pin\.it$/i.test(page.url.hostname)) {
        const source = pinterestSource(html);
        if (!source || pinHops >= 1) throw new Error("NO_RECIPE");
        return fetchRecipeJson(source, pinHops + 1);
    }
    if (!recipe) throw new Error("NO_RECIPE");
    return { recipe, source: page.url };
}

async function importImage(userId: string, url: string | undefined, base: URL): Promise<string | undefined> {
    if (!url) return undefined;
    try {
        const img = await safeFetch(new URL(url, base).toString(), 5 * 1024 * 1024, "image/*");
        return await photoService.upload(userId, img.body);
    } catch {
        return undefined; // photo is a nice-to-have
    }
}

export interface ImportResult {
    recipe: Recipe;
    createdInventoryNames: string[];
    sourceUrl: string;
}

// Whole-word match (optional plural s), longest wins: "unsalted butter" → Butter, not Salt.
export function wholeWordMatch<T extends { name: string }>(ingredient: string, inventory: T[]): T | undefined {
    let best: T | undefined;
    for (const item of inventory) {
        const name = item.name.trim().toLowerCase();
        if (name.length < 3) continue;
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!new RegExp(`(^|[^\\p{L}])${escaped}s?($|[^\\p{L}])`, "u").test(ingredient)) continue;
        if (!best || name.length > best.name.trim().length) best = item;
    }
    return best;
}

export const recipeImportService = {
    async importFromUrl(userId: string, url: string): Promise<ImportResult> {
        const { recipe: ld, source } = await fetchRecipeJson(url);

        const inventory = await inventoryModel.findByScope(userId, null);
        const byName = new Map(inventory.map((i) => [i.name.trim().toLowerCase(), i]));
        const findStock = (name: string) => {
            const key = name.toLowerCase();
            return (
                byName.get(key) ??
                byName.get(key.replace(/s$/, "")) ??
                wholeWordMatch(key, inventory)
            );
        };

        // Unknown ingredients become 0-quantity items (recipes need item refs).
        const ingredients: RecipeIngredient[] = [];
        const createdInventoryNames: string[] = [];
        const createdIds: string[] = [];
        for (const line of asArray(ld.recipeIngredient as string[]).map((l) => decodeEntities(String(l))).filter(Boolean).slice(0, 80)) {
            const parsed = parseIngredient(line);
            let stock = findStock(parsed.name);
            if (!stock) {
                stock = await inventoryService.createInventory({ name: parsed.name, quantity: 0, unit: parsed.unit, userId });
                byName.set(parsed.name.toLowerCase(), stock);
                inventory.push(stock);
                createdInventoryNames.push(parsed.name);
                createdIds.push(stock._id.toString());
            }
            ingredients.push({ inventoryItemId: stock._id.toString(), quantity: parsed.quantity, unit: parsed.unit });
        }

        const nutrition = ld.nutrition as Json | undefined;
        const perServing: Record<string, number> = {};
        for (const [from, to] of [["calories", "calories"], ["proteinContent", "protein"], ["carbohydrateContent", "carbs"], ["fatContent", "fat"]] as const) {
            const n = firstNumber(nutrition?.[from]);
            if (n !== undefined) perServing[to] = n;
        }
        const author = asArray(ld.author as unknown).map((a) => (typeof a === "string" ? a : (a as Json)?.name)).find(Boolean);
        const prep = minutes(ld.prepTime);
        const cook = minutes(ld.cookTime);
        const steps = instructions(ld.recipeInstructions);

        // Save failed: remove the placeholder items.
        const recipe = await recipeService.createRecipe({
            userId,
            title: decodeEntities(String(ld.name ?? "Imported recipe")).slice(0, 200),
            description: ld.description ? decodeEntities(String(ld.description)).slice(0, 2000) : undefined,
            author: String(author ?? source.hostname.replace(/^www\./, "")).slice(0, 200),
            ingredients,
            instructions: steps.length ? steps : ["See the original recipe."],
            prepTimeMinutes: prep,
            cookTimeMinutes: cook,
            totalTimeMinutes: minutes(ld.totalTime) ?? ((prep ?? 0) + (cook ?? 0) || undefined),
            servings: firstNumber(ld.recipeYield),
            tags: [
                ...asArray(ld.recipeCategory as string | string[]),
                ...asArray(ld.recipeCuisine as string | string[])
            ].map((t) => String(t).trim().slice(0, 64)).filter(Boolean).slice(0, 10),
            nutrition: Object.keys(perServing).length ? [perServing] : [],
            difficulty: "medium",
            photoId: await importImage(userId, imageUrl(ld.image), source),
            sourceUrl: source.toString()
        }).catch(async (err) => {
            await Promise.all(createdIds.map((id) => inventoryService.deleteInventory(id).catch(() => {})));
            throw err;
        });
        return { recipe, createdInventoryNames, sourceUrl: source.toString() };
    }
};
