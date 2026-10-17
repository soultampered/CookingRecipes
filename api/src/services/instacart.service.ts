import type { ShoppingList } from "../types/shoppingList.js";
import type { Unit } from "../types/unit.js";

// Instacart shopping-list page: we send items, it returns a checkout link. Needs INSTACART_API_KEY;
// INSTACART_API_BASE switches to the sandbox. No key = disabled.
const UNIT_MAP: Partial<Record<Unit, string>> = {
    g: "gram",
    kg: "kilogram",
    oz: "ounce",
    lb: "pound",
    ml: "milliliter",
    l: "liter",
    tsp: "teaspoon",
    tbsp: "tablespoon",
    cup: "cup",
    "fl oz": "fl oz",
    pint: "pint",
    quart: "quart",
    gallon: "gallon",
    pcs: "each"
};

export const instacartService = {
    enabled(): boolean {
        return Boolean(process.env.INSTACART_API_KEY);
    },

    // Unchecked items only.
    async shoppingListLink(list: ShoppingList): Promise<string> {
        if (!this.enabled()) throw new Error("DISABLED");
        const items = list.items.filter((i) => !i.checked);
        if (!items.length) throw new Error("EMPTY");
        const base = process.env.INSTACART_API_BASE ?? "https://connect.instacart.com";
        const res = await fetch(`${base}/idp/v1/products/products_link`, {
            method: "POST",
            signal: AbortSignal.timeout(10000),
            headers: {
                Authorization: `Bearer ${process.env.INSTACART_API_KEY}`,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                title: list.name,
                link_type: "shopping_list",
                line_items: items.map((i) => ({
                    name: i.name,
                    quantity: i.quantity,
                    unit: (i.unit && UNIT_MAP[i.unit]) || "each",
                    display_text: i.name
                }))
            })
        });
        const body = (await res.json().catch(() => null)) as { products_link_url?: string } | null;
        if (!res.ok || !body?.products_link_url) {
            console.error("Instacart link failed:", res.status, body);
            throw new Error("UPSTREAM");
        }
        return body.products_link_url;
    }
};
