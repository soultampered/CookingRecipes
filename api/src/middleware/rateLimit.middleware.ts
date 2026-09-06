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

function keyFor(c: Parameters<MiddlewareHandler>[0], prefix: string): string {
    const forwardedFor = c.req.header("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || getConnInfo(c).remote.address || "unknown";
    return `${prefix}:${ip}`;
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
