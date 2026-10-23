import crypto from "crypto";
import { apiTokenModel } from "../models/apiToken.model.js";
import { shoppingListModel } from "../models/shoppingList.model.js";
import { inventoryModel } from "../models/inventory.model.js";
import { shoppingListService } from "./shoppingList.service.js";
import type { ShoppingList } from "../types/shoppingList.js";

const TOKEN_PREFIX = "stk_";
// One per assistant/device plus a spare.
export const MAX_TOKENS = 5;
// Unused this long = expired; regular use never hits it.
const IDLE_EXPIRY_MS = 180 * 24 * 60 * 60 * 1000;

function isExpired(t: { createdAt: Date; lastUsedAt?: Date }, now = Date.now()): boolean {
    return (t.lastUsedAt ?? t.createdAt).getTime() < now - IDLE_EXPIRY_MS;
}
const WORD_NUMBERS: Record<string, number> = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, dozen: 12, couple: 2, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5
};

function hash(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

// Names with a separator word stay one item ("mac and cheese"). Inventory names added at call time.
const COMPOUND_NAMES = ["mac and cheese", "half and half", "salt and pepper", "sweet and sour sauce", "bread and butter pickles"];

// "milk, 2 eggs and a dozen bagels" → [{milk,1},{eggs,2},{bagels,12}]
export function parseSpokenItems(text: string, knownNames: string[] = []): { name: string; quantity: number }[] {
    let cleaned = text
        .toLowerCase()
        .replace(/^(please\s+)?(add|put)\s+/, "")
        // "… to my grocery list" / "on the Costco list"; "hot sauce on the side" stays an item.
        .replace(/\s+(to|on)\s+(my|the)\s+(.*\s)?list$/, "")
        .replace(/[.!?]+$/, "");
    const compounds = [...COMPOUND_NAMES, ...knownNames.map((n) => n.trim().toLowerCase())]
        .filter((n) => /\s(and|et|&)\s/.test(n))
        .sort((a, b) => b.length - a.length);
    // Swap each compound for a token the separators can't split, then put it back.
    compounds.forEach((name, i) => (cleaned = cleaned.split(name).join(`\u0001${i}\u0001`)));
    const restore = (part: string) => part.replace(/\u0001(\d+)\u0001/g, (_, i) => compounds[Number(i)]);
    return cleaned
        .split(/\s*(?:,|\band\b|\bet\b|&|\+)\s*/)
        .map((part) => restore(part.trim()).replace(/^(some|of)\s+/, ""))
        .filter(Boolean)
        .map((part) => {
            // "a dozen bagels" / "a couple of limes" → the quantity word is the second one.
            const words = part.split(/\s+/);
            if ((words[0] === "a" || words[0] === "an") && WORD_NUMBERS[words[1]] && words.length > 2) words.shift();
            const [first, ...rest] = words;
            const n = Number(first);
            const word = WORD_NUMBERS[first];
            if (rest.length && (Number.isFinite(n) || word)) {
                const name = rest.join(" ").replace(/^(of)\s+/, "");
                return { name, quantity: Number.isFinite(n) && n > 0 ? n : word };
            }
            return { name: part, quantity: 1 };
        })
        .filter((i) => i.name.length > 0 && i.name.length <= 200)
        .slice(0, 20);
}

function joinNames(names: string[]): string {
    return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export const voiceService = {
    async createToken(userId: string, name: string): Promise<{ token: string; id: string; prefix: string }> {
        const active = (await apiTokenModel.findAllByUserId(userId)).filter((t) => !isExpired(t));
        if (active.length >= MAX_TOKENS) throw new Error("TOO_MANY_TOKENS");
        const token = TOKEN_PREFIX + crypto.randomBytes(24).toString("base64url");
        const prefix = token.slice(0, 10);
        const saved = await apiTokenModel.create({ userId, name, tokenHash: hash(token), prefix, scopes: ["add-items"], createdAt: new Date() });
        return { token, id: saved._id!.toString(), prefix };
    },

    // "expired" lets the caller explain the failure.
    async authenticate(token: string): Promise<string | null | "expired"> {
        if (!token.startsWith(TOKEN_PREFIX)) return null;
        const found = await apiTokenModel.findByHash(hash(token));
        if (!found) return null;
        if (isExpired(found)) return "expired";
        apiTokenModel.touch(found._id!).catch(() => {});
        return found.userId;
    },

    async listTokens(userId: string) {
        return (await apiTokenModel.findAllByUserId(userId)).map(({ tokenHash, ...rest }) => ({ ...rest, expired: isExpired(rest) }));
    },

    revokeToken: (id: string, userId: string) => apiTokenModel.delete(id, userId),

    // Target: the named list (case-insensitive), else the most recent, else a new "Groceries".
    async addSpoken(userId: string, text: string, listName?: string): Promise<{ speech: string; list: ShoppingList }> {
        const known = (await inventoryModel.findAll(userId)).map((i) => i.name);
        const items = parseSpokenItems(text, known);
        if (!items.length) throw new Error("NOTHING_HEARD");
        const lists = await shoppingListModel.findByScope(userId, null);
        let list =
            (listName && lists.find((l) => l.name.trim().toLowerCase() === listName.trim().toLowerCase())) ||
            [...lists].sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))[0];
        if (!list) list = await shoppingListService.createShoppingList({ name: "Groceries", userId, items: [] });
        for (const item of items) list = await shoppingListService.addItem(list._id!.toString(), item);
        return { speech: `Added ${joinNames(items.map((i) => i.name))} to ${list.name}.`, list };
    }
};
