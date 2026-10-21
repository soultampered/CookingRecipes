import { GrowthBookClient, type FeatureApiResponse } from "@growthbook/growthbook";
import { connectToDatabase } from "../mongo.js";
import { FEATURE_KEYS, type FeatureKey } from "../config/features.js";

// Flags from GrowthBook, evaluated server-side only; last good payload kept in Mongo for outages.
// No GROWTHBOOK_CLIENT_KEY: all off, unless FEATURES_ALL_ON=1.

const PAYLOAD_DOC = "growthbook";
const SAVE_EVERY_MS = 5 * 60 * 1000;

interface SavedPayload {
    _id: string;
    payload: FeatureApiResponse;
    savedAt: Date;
}

let client: GrowthBookClient | null = null;
let overrides: Partial<Record<FeatureKey, boolean>> | null = null;
const allOn = () => process.env.FEATURES_ALL_ON === "1";

async function payloads() {
    return (await connectToDatabase()).collection<SavedPayload>("feature_payloads");
}

let lastSaved = "";
async function savePayload(payload: FeatureApiResponse): Promise<void> {
    const json = JSON.stringify(payload);
    if (!payload.features || json === lastSaved) return;
    await (await payloads()).updateOne({ _id: PAYLOAD_DOC }, { $set: { payload, savedAt: new Date() } }, { upsert: true });
    lastSaved = json;
}

export const featuresService = {
    async init(): Promise<void> {
        const clientKey = process.env.GROWTHBOOK_CLIENT_KEY;
        if (!clientKey) {
            console.warn(`GROWTHBOOK_CLIENT_KEY not set: release flags are ${allOn() ? "all on" : "all off"}.`);
            return;
        }
        const gb = new GrowthBookClient({ apiHost: "https://cdn.growthbook.io", clientKey });
        const res = await gb.init({ timeout: 3000, pollingInterval: 60_000, streaming: false });
        if (res.success) {
            await savePayload(gb.getPayload()).catch((err) => console.error("Failed to save feature payload:", err));
        } else {
            console.error(`GrowthBook unavailable at boot (${res.source}); using the saved payload.`);
            const saved = await (await payloads()).findOne({ _id: PAYLOAD_DOC }).catch(() => null);
            if (saved) await gb.setPayload(saved.payload);
        }
        client = gb;
        // Persist polled updates for the next boot.
        setInterval(() => {
            savePayload(gb.getPayload()).catch((err) => console.error("Failed to save feature payload:", err));
        }, SAVE_EVERY_MS).unref();
    },

    isOn(key: FeatureKey, userId: string | undefined): boolean {
        if (overrides) return overrides[key] ?? false;
        if (!client) return allOn();
        // Only the user id goes to GrowthBook.
        return client.isOn(key, { attributes: { id: userId ?? "" } });
    },

    enabledFor(userId: string | undefined): FeatureKey[] {
        return FEATURE_KEYS.filter((key) => this.isOn(key, userId));
    },

    // Tests only: fixed flag values, no network. null clears.
    setOverrides(values: Partial<Record<FeatureKey, boolean>> | null): void {
        overrides = values;
    },

    // Tests only.
    _setClient(gb: GrowthBookClient | null): void {
        client = gb;
    }
};
