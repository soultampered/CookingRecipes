import { inventoryEventModel } from "../models/inventoryEvent.model.js";
import { inventoryModel } from "../models/inventory.model.js";
import type { InventoryEventSource, RestockPrediction } from "../types/inventoryEvent.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;
// Needs a little history before guessing: at least two uses spread over a day or more.
const MIN_EVENTS = 2;

export const restockService = {
    async log(userId: string, changes: { itemId: string; delta: number }[], source: InventoryEventSource): Promise<void> {
        const at = new Date();
        try {
            await inventoryEventModel.createMany(
                changes.filter((c) => c.delta !== 0).map((c) => ({ userId, itemId: c.itemId, delta: c.delta, source, at }))
            );
        } catch (err) {
            console.error("Failed to log inventory events:", err);
        }
    },

    // Rate = net consumption over the window ÷ days since first use in it. Restocks (manual
    // increases, shopping check-offs) aren't consumption; positive /adjust (undo) offsets it.
    async predict(userId: string, horizonDays: number, householdId: string | null = null): Promise<RestockPrediction[]> {
        const now = Date.now();
        // Household pantries count every member's usage.
        const events = householdId
            ? await inventoryEventModel.findSinceForItems(
                  (await inventoryModel.findByScope(userId, householdId)).map((i) => i._id.toString()),
                  new Date(now - WINDOW_DAYS * DAY_MS)
              )
            : await inventoryEventModel.findSince(userId, new Date(now - WINDOW_DAYS * DAY_MS));
        const byItem = new Map<string, typeof events>();
        for (const e of events) byItem.set(e.itemId, [...(byItem.get(e.itemId) ?? []), e]);

        const items = await inventoryModel.findByScope(userId, householdId);
        const out: RestockPrediction[] = [];
        for (const item of items) {
            const id = item._id.toString();
            const evs = byItem.get(id) ?? [];
            const uses = evs.filter((e) => e.delta < 0);
            if (uses.length < MIN_EVENTS || item.quantity <= 0) continue;
            const undone = evs.filter((e) => e.source === "adjust" && e.delta > 0).reduce((s, e) => s + e.delta, 0);
            const consumed = uses.reduce((s, e) => s - e.delta, 0) - undone;
            if (consumed <= 0) continue;
            const firstUse = Math.min(...uses.map((e) => e.at.getTime()));
            const spanDays = Math.max(1, (now - firstUse) / DAY_MS);
            const dailyUse = consumed / spanDays;
            const daysLeft = item.quantity / dailyUse;
            if (daysLeft > horizonDays) continue;
            out.push({
                itemId: id,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                dailyUse: Math.round(dailyUse * 100) / 100,
                daysLeft: Math.round(daysLeft * 10) / 10,
                runOutOn: new Date(now + daysLeft * DAY_MS)
            });
        }
        return out.sort((a, b) => a.daysLeft - b.daysLeft);
    }
};
