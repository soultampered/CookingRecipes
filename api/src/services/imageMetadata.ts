// Photos are public by token, so strip EXIF/XMP/comments server-side. Pixels untouched.

function stripJpeg(data: Buffer): Buffer {
    const out: Buffer[] = [data.subarray(0, 2)]; // SOI
    let i = 2;
    while (i + 4 <= data.length && data[i] === 0xff) {
        const marker = data[i + 1];
        // Start of scan: the rest is image data.
        if (marker === 0xda) break;
        const len = data.readUInt16BE(i + 2);
        // APP1 (Exif/XMP), APP2-APP15 and COM, except colour data: APP2 ICC and APP14 Adobe.
        const isIcc = marker === 0xe2 && data.subarray(i + 4, i + 16).toString("latin1") === "ICC_PROFILE\0";
        const drop = ((marker >= 0xe1 && marker <= 0xef && marker !== 0xee) || marker === 0xfe) && !isIcc;
        if (!drop) out.push(data.subarray(i, i + 2 + len));
        i += 2 + len;
    }
    out.push(data.subarray(i));
    return Buffer.concat(out);
}

const PNG_DROP = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);

function stripPng(data: Buffer): Buffer {
    const out: Buffer[] = [data.subarray(0, 8)];
    let i = 8;
    while (i + 12 <= data.length) {
        const len = data.readUInt32BE(i);
        const type = data.subarray(i + 4, i + 8).toString("latin1");
        const end = i + 12 + len;
        if (!PNG_DROP.has(type)) out.push(data.subarray(i, end));
        i = end;
        if (type === "IEND") break;
    }
    return Buffer.concat(out);
}

function stripWebp(data: Buffer): Buffer {
    const chunks: Buffer[] = [];
    let i = 12;
    while (i + 8 <= data.length) {
        const type = data.subarray(i, i + 4).toString("latin1");
        const len = data.readUInt32LE(i + 4);
        const end = i + 8 + len + (len % 2);
        if (type !== "EXIF" && type !== "XMP ") {
            const chunk = Buffer.from(data.subarray(i, end));
            // VP8X flags: clear the EXIF (0x08) and XMP (0x04) bits.
            if (type === "VP8X") chunk[8] &= ~0x0c;
            chunks.push(chunk);
        }
        i = end;
    }
    const body = Buffer.concat(chunks);
    const header = Buffer.alloc(12);
    header.write("RIFF", 0, "latin1");
    header.writeUInt32LE(4 + body.length, 4);
    header.write("WEBP", 8, "latin1");
    return Buffer.concat([header, body]);
}

export function stripImageMetadata(data: Buffer, contentType: string): Buffer {
    try {
        if (contentType === "image/jpeg") return stripJpeg(data);
        if (contentType === "image/png") return stripPng(data);
        if (contentType === "image/webp") return stripWebp(data);
    } catch {
        // Malformed: reject rather than store it unstripped.
        throw new Error("BAD_TYPE");
    }
    return data;
}
