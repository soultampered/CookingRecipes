import { GridFSBucket } from "mongodb";
import { connectToDatabase } from "../mongo.js";

// STO-19: photos live in Mongo GridFS — Render's disk is ephemeral and there's no object
// store yet. Files are addressed by an unguessable token (the filename), not the ObjectId.
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

    deleteAllByUserId: async (userId: string): Promise<void> => {
        const b = await bucket();
        for (const f of await b.find({ "metadata.userId": userId }).toArray()) await b.delete(f._id);
    }
};
