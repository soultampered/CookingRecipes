import type { MiddlewareHandler } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";

interface Bucket {
    count: number;
    resetAt: number;
}

// In-memory is fine for Render's single free-tier instance (per STO-31) — would need
// an external store (Redis, etc.) if this ever scales to multiple instances, since each
// instance would otherwise track its own independent bucket.
const buckets = new Map<string, Bucket>();

// Without this, buckets accumulate one entry per distinct IP/prefix forever.
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
}, 10 * 60 * 1000).unref();

// Prefer CF-Connecting-IP (Cloudflare overwrites it). Else XFF, counting TRUST_PROXY_HOPS from the
// end: the first entry is client-controlled. 0 = no proxy (local dev).
const TRUSTED_HOPS = Number(process.env.TRUST_PROXY_HOPS ?? 1);
// LOG_CLIENT_IP_HEADERS=1 logs the raw IP headers of the first 20 requests.
let headerLogsLeft = process.env.LOG_CLIENT_IP_HEADERS === "1" ? 20 : 0;

export function clientIp(
    forwardedFor: string | undefined,
    socketAddress: string | undefined,
    hops = TRUSTED_HOPS,
    cfConnectingIp?: string
): string {
    if (cfConnectingIp?.trim()) return cfConnectingIp.trim();
    const parts = forwardedFor?.split(",").map((p) => p.trim()).filter(Boolean) ?? [];
    if (hops > 0 && parts.length >= hops) return parts[parts.length - hops];
    return socketAddress || "unknown";
}

function keyFor(c: Parameters<MiddlewareHandler>[0], prefix: string): string {
    let socket: string | undefined;
    try {
        socket = getConnInfo(c).remote.address;
    } catch {
        // not running on @hono/node-server (tests)
    }
    const xff = c.req.header("x-forwarded-for");
    const cf = c.req.header("cf-connecting-ip");
    if (headerLogsLeft > 0) {
        headerLogsLeft--;
        console.log("client-ip headers", { xff, cf, trueClientIp: c.req.header("true-client-ip"), socket });
    }
    return `${prefix}:${clientIp(xff, socket, TRUSTED_HOPS, cf)}`;
}

export function rateLimit(options: { windowMs: number; max: number; prefix: string }): MiddlewareHandler {
    const { windowMs, max, prefix } = options;
    return async (c, next) => {
        const key = keyFor(c, prefix);
        const now = Date.now();
        const bucket = buckets.get(key);

        if (!bucket || bucket.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (bucket.count >= max) {
            const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
            c.header("Retry-After", String(retryAfterSeconds));
            return c.json({ error: "Too many requests, please try again later" }, 429);
        }

        bucket.count += 1;
        return next();
    };
}
