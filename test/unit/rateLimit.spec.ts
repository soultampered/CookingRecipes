import { describe, it, expect } from 'vitest'
import { clientIp } from '../../api/src/middleware/rateLimit.middleware.js'

describe('clientIp', () => {
    // Shape seen on Render: "<client-sent>, <real client>, <Cloudflare edge>, <Render internal>"
    it('defaults to the real client in Render\'s XFF, not the edge or internal hop', () => {
        expect(clientIp('6.6.6.6, 203.0.113.7, 172.71.195.130, 10.29.166.92', '::1')).toBe('203.0.113.7')
        expect(clientIp('203.0.113.7, 162.158.127.156, 10.27.74.163', '::1')).toBe('203.0.113.7')
    })

    it('a spoofed header alone changes nothing', () => {
        const a = clientIp('9.9.9.1, 203.0.113.7, 172.71.195.130, 10.29.166.92', undefined)
        const b = clientIp('9.9.9.2, 203.0.113.7, 162.158.127.156, 10.27.74.163', undefined)
        expect(a).toBe(b)
    })

    it('falls back to the socket address without the header or with hops = 0', () => {
        expect(clientIp(undefined, '127.0.0.1')).toBe('127.0.0.1')
        expect(clientIp('1.2.3.4', '127.0.0.1')).toBe('127.0.0.1')
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
