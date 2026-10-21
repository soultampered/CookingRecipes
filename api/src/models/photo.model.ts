import { GridFSBucket } from "mongodb";
import { connectToDatabase } from "../mongo.js";

// Photos live in GridFS (Render's disk is ephemeral), addressed by an unguessable token.
async function bucket() {
    return new GridFSBucket(await connectToDatabase(), { bucketName: "photos" });
}

export interface PhotoMeta {
    userId: string;
    contentType: string;
}

export const photoModel = {
    save: async (token: string, data: Buffer, meta: PhotoMeta): Promise<void> => {
        const b = await bucket();
        await new Promise<void>((resolve, reject) => {
            const upload = b.openUploadStream(token, { metadata: meta });
            upload.on("error", reject);
            upload.on("finish", () => resolve());
            upload.end(data);
        });
    },

    find: async (token: string) => {
        const b = await bucket();
        const [file] = await b.find({ filename: token }).limit(1).toArray();
        return file ? { file, meta: file.metadata as PhotoMeta } : null;
    },

    read: async (token: string): Promise<Buffer> => {
        const b = await bucket();
        const chunks: Buffer[] = [];
        for await (const chunk of b.openDownloadStreamByName(token)) chunks.push(chunk as Buffer);
        return Buffer.concat(chunks);
    },

    delete: async (token: string): Promise<void> => {
        const b = await bucket();
        for (const f of await b.find({ filename: token }).toArray()) await b.delete(f._id);
    },

    usageBytes: async (userId: string): Promise<number> => {
        const db = await connectToDatabase();
        const [row] = await db.collection("photos.files")
            .aggregate<{ total: number }>([{ $match: { "metadata.userId": userId } }, { $group: { _id: null, total: { $sum: "$length" } } }])
            .toArray();
        return row?.total ?? 0;
    },

    tokensUploadedBefore: async (before: Date): Promise<string[]> => {
        const b = await bucket();
        return (await b.find({ uploadDate: { $lt: before } }).project({ filename: 1 }).toArray()).map((f) => f.filename);
    },

    // Tokens still pointed at by a recipe or inventory item.
    referencedTokens: async (tokens: string[]): Promise<Set<string>> => {
        const db = await connectToDatabase();
        const [recipes, items] = await Promise.all([
            db.collection("recipes").distinct("photoId", { photoId: { $in: tokens } }),
            db.collection("inventory").distinct("photoId", { photoId: { $in: tokens } })
        ]);
        return new Set([...recipes, ...items] as string[]);
    },

    listByUserId: async (userId: string) => {
        const b = await bucket();
        return (await b.find({ "metadata.userId": userId }).toArray()).map((f) => ({
            id: f.filename,
            url: `/photos/${f.filename}`,
            contentType: (f.metadata as PhotoMeta).contentType,
            bytes: f.length,
            uploadedAt: f.uploadDate
        }));
    },

    deleteAllByUserId: async (userId: string): Promise<void> => {
        const b = await bucket();
        for (const f of await b.find({ "metadata.userId": userId }).toArray()) await b.delete(f._id);
    }
};
