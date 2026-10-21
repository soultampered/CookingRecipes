import dns from "dns";
import net from "net";
import ipaddr from "ipaddr.js";
import { Agent, fetch } from "undici";

// User-supplied URLs: every hop checked for private addresses, redirects by hand, size/time capped.
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8000;

// Globally routable unicast only. process() unwraps IPv4-mapped IPv6.
export function isPublicIp(ip: string): boolean {
    try {
        return ipaddr.process(ip).range() === "unicast";
    } catch {
        return false;
    }
}

// Checked at connect time, so DNS rebinding can't slip through.
export const guardedLookup: net.LookupFunction = (hostname, options, cb) => {
    dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
        if (err) return cb(err, "");
        if (!addrs.length || addrs.some((a) => !isPublicIp(a.address))) {
            return cb(Object.assign(new Error("BAD_URL"), { code: "BAD_URL" }), "");
        }
        if (options.all) return cb(null, addrs);
        cb(null, addrs[0].address, addrs[0].family);
    });
};

const dispatcher = new Agent({ connect: { lookup: guardedLookup } });

function assertAllowedUrl(url: URL): void {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("BAD_URL");
    if (url.username || url.password) throw new Error("BAD_URL");
    // Literal IPs skip DNS, so the connect-time lookup never sees them.
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(host) && !isPublicIp(host)) throw new Error("BAD_URL");
}

function rethrow(err: unknown): never {
    const cause = (err as { cause?: { code?: string } }).cause;
    if (cause?.code === "BAD_URL") throw new Error("BAD_URL");
    throw err;
}

export async function safeFetch(rawUrl: string, maxBytes: number, accept: string): Promise<{ url: URL; body: Buffer; contentType: string }> {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new Error("BAD_URL");
    }
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        assertAllowedUrl(url);
        const res = await fetch(url, {
            dispatcher,
            redirect: "manual",
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: { "User-Agent": "Mozilla/5.0 (compatible; StokpotImporter/1.0; +https://stokpot.ca)", Accept: accept }
        }).catch(rethrow);
        if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
            url = new URL(res.headers.get("location")!, url);
            continue;
        }
        if (!res.ok) throw new Error("FETCH_FAILED");
        if (Number(res.headers.get("content-length") ?? 0) > maxBytes) throw new Error("TOO_LARGE");
        const reader = res.body?.getReader();
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.length;
            if (total > maxBytes) {
                await reader.cancel();
                throw new Error("TOO_LARGE");
            }
            chunks.push(value);
        }
        return { url, body: Buffer.concat(chunks), contentType: res.headers.get("content-type") ?? "" };
    }
    throw new Error("FETCH_FAILED");
}
