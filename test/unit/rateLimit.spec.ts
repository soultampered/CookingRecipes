import { describe, it, expect } from 'vitest'
import { clientIp } from '../../api/src/middleware/rateLimit.middleware.js'

describe('clientIp', () => {
    it('uses the entry the trusted proxy appended, not the client-supplied one', () => {
        // client sent "6.6.6.6"; Render appended the real address
        expect(clientIp('6.6.6.6, 203.0.113.7', '10.0.0.2')).toBe('203.0.113.7')
        expect(clientIp('1.1.1.1, 2.2.2.2, 203.0.113.7', '10.0.0.2')).toBe('203.0.113.7')
    })

    it('a spoofed header alone changes nothing once Render appends', () => {
        const a = clientIp('9.9.9.1, 203.0.113.7', undefined)
        const b = clientIp('9.9.9.2, 203.0.113.7', undefined)
        expect(a).toBe(b)
    })

    it('falls back to the socket address without the header or with hops = 0', () => {
        expect(clientIp(undefined, '127.0.0.1')).toBe('127.0.0.1')
        expect(clientIp('6.6.6.6', '127.0.0.1', 0)).toBe('127.0.0.1')
    })

    it('honours two proxy hops', () => {
        expect(clientIp('6.6.6.6, 203.0.113.7, 10.1.1.1', undefined, 2)).toBe('203.0.113.7')
    })
})

describe('clientIp with Cloudflare', () => {
    it('prefers CF-Connecting-IP, which Cloudflare sets and overwrites', () => {
        expect(clientIp('6.6.6.6, 203.0.113.7, 172.68.1.1', '10.0.0.2', 1, '203.0.113.7')).toBe('203.0.113.7')
    })

    it('falls back to the hop count without it', () => {
        expect(clientIp('6.6.6.6, 203.0.113.7', '10.0.0.2', 1, undefined)).toBe('203.0.113.7')
    })
})
