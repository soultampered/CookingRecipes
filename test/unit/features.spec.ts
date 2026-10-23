import { describe, it, expect, afterEach, vi } from 'vitest'
import { Hono } from 'hono'
import { GrowthBookClient } from '@growthbook/growthbook'

vi.mock('../../api/src/middleware/auth.middleware.js', () => ({
    authMiddleware: async (c: any, next: any) => { c.set('userId', c.req.header('x-user') ?? 'u1'); await next() }
}))

import { featuresService } from '../../api/src/services/features.service.js'
import { requireFeature } from '../../api/src/middleware/requireFeature.middleware.js'
import featuresRoute from '../../api/src/routes/features.route.js'
import { FEATURE_KEYS } from '../../api/src/config/features.js'

afterEach(() => {
    featuresService.setOverrides(null)
    featuresService._setClient(null)
    process.env.FEATURES_ALL_ON = '1'
})

describe('featuresService', () => {
    it('is all off without a GrowthBook key, or all on with FEATURES_ALL_ON=1', () => {
        process.env.FEATURES_ALL_ON = ''
        expect(featuresService.isOn('mealPlan', 'u1')).toBe(false)
        process.env.FEATURES_ALL_ON = '1'
        expect(featuresService.enabledFor('u1')).toEqual(FEATURE_KEYS)
    })

    it('evaluates GrowthBook rules per user id (testers get unreleased flags)', () => {
        const gb = new GrowthBookClient().initSync({
            payload: {
                features: {
                    ratings: { defaultValue: true },
                    mealPlan: { defaultValue: false, rules: [{ condition: { id: { $in: ['tester-1'] } }, force: true }] }
                }
            }
        })
        featuresService._setClient(gb)
        expect(featuresService.enabledFor('someone')).toEqual(['ratings'])
        expect(featuresService.enabledFor('tester-1')).toEqual(['ratings', 'mealPlan'])
        // Not in the payload = off
        expect(featuresService.isOn('instacart', 'tester-1')).toBe(false)
    })
})

describe('requireFeature', () => {
    const app = new Hono()
        .use('*', async (c, next) => { c.set('userId' as never, 'u1' as never); await next() })
        .get('/plan', requireFeature('mealPlan'), (c) => c.text('ok'))

    it('serves the route when the flag is on', async () => {
        featuresService.setOverrides({ mealPlan: true })
        expect((await app.request('/plan')).status).toBe(200)
    })

    it('answers 404 when the flag is off', async () => {
        featuresService.setOverrides({ mealPlan: false })
        const res = await app.request('/plan')
        expect(res.status).toBe(404)
        expect(await res.json()).toEqual({ error: 'Not found' })
    })
})

describe('GET /features', () => {
    it('lists the flags on for the caller', async () => {
        featuresService.setOverrides({ ratings: true, photos: true, mealPlan: false })
        const res = await new Hono().route('/features', featuresRoute).request('/features')
        expect(await res.json()).toEqual({ enabled: ['ratings', 'photos'] })
    })
})

describe('flagged route groups', () => {
    it('/nutrition answers 404 while nutrition is off', async () => {
        vi.doMock('../../api/src/middleware/requireVerified.middleware.js', () => ({ requireVerified: async (_c: any, next: any) => { await next() } }))
        const { default: nutritionRoute } = await import('../../api/src/routes/nutrition.route.js')
        const app = new Hono().route('/nutrition', nutritionRoute)
        featuresService.setOverrides({ nutrition: false })
        expect((await app.request('/nutrition/summary?days=1&tz=0')).status).toBe(404)
    })
})
