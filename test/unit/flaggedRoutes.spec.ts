import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('../../api/src/middleware/auth.middleware.js', () => ({
    authMiddleware: async (c: any, next: any) => { c.set('userId', 'u1'); await next() }
}))
vi.mock('../../api/src/middleware/requireVerified.middleware.js', () => ({
    requireVerified: async (_c: any, next: any) => { await next() }
}))

import app from '../../api/src/index.js'
import { featuresService } from '../../api/src/services/features.service.js'
import type { FeatureKey } from '../../api/src/config/features.js'

const id = 'a'.repeat(24)
// Every flag-guarded endpoint: off → 404 before any handler.
const ROUTES: [FeatureKey, string, string, unknown?][] = [
    ['nutrition', 'GET', '/nutrition/summary?days=1&tz=0'],
    ['collections', 'GET', '/collections'],
    ['priceWatch', 'GET', '/prices?names=milk'],
    ['mealPlan', 'GET', '/meal-plan?from=2026-10-19&to=2026-10-25'],
    ['photos', 'POST', '/photos'],
    ['barcode', 'GET', '/barcode/0001'],
    ['households', 'GET', '/households'],
    ['voiceAdd', 'GET', '/integrations/tokens'],
    ['recipeImport', 'POST', '/recipes/import', { url: 'https://example.com/r' }],
    ['versionHistory', 'GET', `/recipes/${id}/revisions`],
    ['shareLinks', 'POST', `/recipes/${id}/share`],
    ['mealPrep', 'POST', '/shopping-lists/from-recipes/preview', { recipes: [{ recipeId: id }] }],
    ['instacart', 'POST', `/shopping-lists/${id}/instacart`],
    ['restock', 'GET', '/inventory/restock']
]

const call = (method: string, path: string, body?: unknown) =>
    app.request(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })

describe('flagged routes', () => {
    afterEach(() => featuresService.setOverrides(null))

    it.each(ROUTES)('%s: %s %s is 404 while off', async (flag, method, path, body) => {
        featuresService.setOverrides({ [flag]: false })
        const res = await call(method, path, body)
        expect(res.status).toBe(404)
        expect(await res.json()).toEqual({ error: 'Not found' })
    })

    it.each(ROUTES)('%s: %s %s reaches its handler while on', async (flag, method, path, body) => {
        featuresService.setOverrides({ [flag]: true })
        const res = await call(method, path, body)
        // The handler runs (no DB here, so it may fail), but not the flag's 404.
        const json = await res.json().catch(() => ({}))
        expect(res.status === 404 && json.error === 'Not found').toBe(false)
    })
})
