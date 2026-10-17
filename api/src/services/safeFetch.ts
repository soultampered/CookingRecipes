import dns from "dns/promises";
import net from "net";

// STO-17: the server fetches user-supplied URLs, so every hop is checked against private
// address space (SSRF), redirects are followed by hand, and size/time are capped.
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8000;

function isPrivate(ip: string): boolean {
    if (net.isIPv4(ip)) {
        const [a, b] = ip.split(".").map(Number);
        return (
            a === 10 || a === 127 || a === 0 ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            (a === 100 && b >= 64 && b <= 127) ||
            a >= 224
        );
    }
    const v6 = ip.toLowerCase();
    if (v6.startsWith("::ffff:")) return isPrivate(v6.slice(7));
    return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

async function assertPublic(url: URL): Promise<void> {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("BAD_URL");
    if (url.username || url.password) throw new Error("BAD_URL");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
    if (!addrs.length || addrs.some((a) => isPrivate(a.address))) throw new Error("BAD_URL");
}

export async function safeFetch(rawUrl: string, maxBytes: number, accept: string): Promise<{ url: URL; body: Buffer; contentType: string }> {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new Error("BAD_URL");
    }
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        await assertPublic(url);
        const res = await fetch(url, {
            redirect: "manual",
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: { "User-Agent": "Mozilla/5.0 (compatible; StokpotImporter/1.0; +https://stokpot.ca)", Accept: accept }
        });
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
