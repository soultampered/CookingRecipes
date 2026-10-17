import type { Unit } from "../types/unit.js";

// "1 1/2 cups flour, sifted" → { quantity: 1.5, unit: "cup", name: "flour" }
const UNICODE_FRACTIONS: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125, "⅕": 0.2 };

const UNIT_WORDS: [RegExp, Unit][] = [
    [/^(tablespoons?|tbsps?|tbs|tbl|T)\.?$/, "tbsp"],
    [/^(teaspoons?|tsps?|t)\.?$/, "tsp"],
    [/^(cups?|c)\.?$/, "cup"],
    [/^(grams?|g|gr)\.?$/, "g"],
    [/^(kilograms?|kgs?)\.?$/, "kg"],
    [/^(ounces?|oz)\.?$/, "oz"],
    [/^(pounds?|lbs?)\.?$/, "lb"],
    [/^(millilitres?|milliliters?|mls?)\.?$/, "ml"],
    [/^(litres?|liters?|l)\.?$/, "l"],
    [/^(pints?|pt)\.?$/, "pint"],
    [/^(quarts?|qt)\.?$/, "quart"],
    [/^(gallons?|gal)\.?$/, "gallon"],
    [/^pinch(es)?$/, "pinch"],
    [/^dash(es)?$/, "dash"],
    [/^(pieces?|pcs?|whole|cloves?|slices?|cans?|eggs?)$/, "pcs"]
];

export interface ParsedIngredient {
    quantity: number;
    unit: Unit;
    name: string;
}

function parseNumber(token: string): number | null {
    if (token in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[token];
    const mixedUnicode = token.match(/^(\d+)([¼½¾⅓⅔⅛⅕])$/);
    if (mixedUnicode) return Number(mixedUnicode[1]) + UNICODE_FRACTIONS[mixedUnicode[2]];
    const frac = token.match(/^(\d+)\/(\d+)$/);
    if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : null;
    const range = token.match(/^(\d+(?:\.\d+)?)[-–](\d+(?:\.\d+)?)$/); // "2-3" → take the larger
    if (range) return Number(range[2]);
    const n = Number(token.replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

export function parseIngredient(line: string): ParsedIngredient {
    const clean = line.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    const tokens = clean.split(" ");
    let quantity = 0;
    let i = 0;
    while (i < tokens.length) {
        const n = parseNumber(tokens[i]);
        if (n === null) break;
        quantity += n;
        i++;
    }
    let unit: Unit = "pcs";
    if (i < tokens.length) {
        const word = tokens[i].replace(/[.,]$/, "");
        const match = UNIT_WORDS.find(([re]) => re.test(word) || re.test(word.toLowerCase()));
        if (match) {
            unit = match[1];
            // keep "eggs" as the name when it's the only noun ("2 eggs")
            if (!(match[1] === "pcs" && i === tokens.length - 1)) i++;
        }
    }
    let name = tokens.slice(i).join(" ").replace(/^of\s+/i, "");
    name = name.split(/,|;| - /)[0].trim() || clean;
    return { quantity: quantity || 1, unit, name: name.slice(0, 200) };
}
