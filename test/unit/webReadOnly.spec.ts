import { describe, it, expect, afterEach } from 'vitest'
import { Hono } from 'hono'
import { webReadOnly } from '../../api/src/middleware/webReadOnly.middleware.js'
import { featuresService } from '../../api/src/services/features.service.js'

const app = new Hono().use('*', webReadOnly).all('*', (c) => c.text('ok'))
const call = (method: string, path: string, origin?: string) =>
    app.request(path, { method, headers: origin ? { Origin: origin } : {} })

describe('webReadOnly', () => {
    afterEach(() => featuresService.setOverrides(null))

    it('refuses writes from a browser while webEditing is off', async () => {
        featuresService.setOverrides({ webEditing: false })
        const res = await call('POST', '/recipes', 'https://app.stokpot.ca')
        expect(res.status).toBe(403)
        expect((await res.json()).code).toBe('WEB_READ_ONLY')
    })

    it('lets reads, the native app, origin-less callers and sign-in through', async () => {
        featuresService.setOverrides({ webEditing: false })
        expect((await call('GET', '/recipes', 'https://app.stokpot.ca')).status).toBe(200)
        expect((await call('POST', '/recipes', 'capacitor://localhost')).status).toBe(200)
        expect((await call('POST', '/recipes', 'http://localhost')).status).toBe(200)
        expect((await call('POST', '/integrations/voice/add')).status).toBe(200)
        expect((await call('POST', '/auth/login', 'https://app.stokpot.ca')).status).toBe(200)
    })

    it('allows browser writes once webEditing is on', async () => {
        featuresService.setOverrides({ webEditing: true })
        expect((await call('DELETE', '/recipes/1', 'https://app.stokpot.ca')).status).toBe(200)
    })
})
