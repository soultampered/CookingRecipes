import crypto from "crypto";
import { photoModel } from "../models/photo.model.js";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Trust the bytes, not the Content-Type header.
function sniff(data: Buffer): string | null {
    if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
    if (data.length > 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
    if (data.length > 12 && data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP") return "image/webp";
    return null;
}

export const photoService = {
    async upload(userId: string, data: Buffer): Promise<string> {
        if (data.length === 0 || data.length > MAX_PHOTO_BYTES) throw new Error("BAD_SIZE");
        const contentType = sniff(data);
        if (!contentType) throw new Error("BAD_TYPE");
        const token = crypto.randomBytes(16).toString("hex");
        await photoModel.save(token, data, { userId, contentType });
        return token;
    },

    async get(token: string) {
        if (!/^[0-9a-f]{32}$/.test(token)) return null;
        const found = await photoModel.find(token);
        if (!found) return null;
        return { contentType: found.meta.contentType, data: await photoModel.read(token) };
    },

    // Attaching someone else's upload to your recipe would let you hijack its lifetime.
    async assertOwned(token: string, userId: string): Promise<void> {
        const found = await photoModel.find(token);
        if (!found || found.meta.userId !== userId) throw new Error("UNKNOWN_PHOTO");
    },

    async remove(token?: string | null): Promise<void> {
        if (token) await photoModel.delete(token).catch((err) => console.error("Failed to delete photo:", err));
    }
};
