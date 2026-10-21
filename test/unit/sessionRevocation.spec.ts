import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => { process.env.JWT_SECRET = 'test-secret-'.repeat(4) })

import jwt from 'jsonwebtoken'
import { Hono } from 'hono'
import { authMiddleware } from '../../api/src/middleware/auth.middleware.js'
import { tokenRevocation } from '../../api/src/services/tokenRevocation.js'

const app = new Hono().use('*', authMiddleware).get('/', (c) => c.text('ok'))
const call = (token: string) => app.request('/', { headers: { Authorization: `Bearer ${token}` } })
const sign = (payload: object) => jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' })

describe('session revocation', () => {
    it('rejects an access token whose session was revoked elsewhere', async () => {
        const token = sign({ userId: 'u1', sid: 'fam-a' })
        expect((await call(token)).status).toBe(200)
        tokenRevocation.revokeSessions(['fam-a'], Date.now() + 60_000)
        const res = await call(token)
        expect(res.status).toBe(401)
        expect((await res.json()).code).toBe('TOKEN_EXPIRED')
    })

    it('leaves other sessions and pre-sid tokens alone', async () => {
        tokenRevocation.revokeSessions(['fam-b'], Date.now() + 60_000)
        expect((await call(sign({ userId: 'u1', sid: 'fam-c' }))).status).toBe(200)
        expect((await call(sign({ userId: 'u1' }))).status).toBe(200)
    })
})
