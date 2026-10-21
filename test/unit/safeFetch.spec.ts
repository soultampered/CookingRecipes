import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import dns from 'dns'
import http from 'http'
import type { AddressInfo } from 'net'
import { safeFetch, isPublicIp, guardedLookup } from '../../api/src/services/safeFetch.js'

describe('isPublicIp', () => {
    it.each([
        '127.0.0.1', '::ffff:127.0.0.1', '::ffff:7f00:1', '10.0.0.1', '172.16.0.1', '192.168.1.1',
        '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fd00::1', 'fe80::1',
        '2002:7f00:1::', 'not-an-ip'
    ])('blocks %s', (ip) => {
        expect(isPublicIp(ip)).toBe(false)
    })

    it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('allows %s', (ip) => {
        expect(isPublicIp(ip)).toBe(true)
    })
})

describe('safeFetch', () => {
    let server: http.Server
    let port: number
    let hits = 0

    beforeAll(async () => {
        server = http.createServer((_req, res) => { hits++; res.end('secret') })
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
        port = (server.address() as AddressInfo).port
    })
    afterAll(() => { server.close() })
    afterEach(() => { vi.restoreAllMocks(); hits = 0 })

    it('rejects an IPv4-mapped IPv6 loopback literal', async () => {
        await expect(safeFetch(`http://[::ffff:127.0.0.1]:${port}/`, 1024, '*/*')).rejects.toThrow('BAD_URL')
        expect(hits).toBe(0)
    })

    it('rejects a hostname that resolves to loopback at connect time', async () => {
        vi.spyOn(dns, 'lookup').mockImplementation(((_host: string, _opts: unknown, cb: Function) =>
            cb(null, [{ address: '127.0.0.1', family: 4 }])) as any)
        await expect(safeFetch(`http://rebind.example:${port}/`, 1024, '*/*')).rejects.toThrow('BAD_URL')
        expect(hits).toBe(0)
    })

    it('rejects non-http schemes and credentials', async () => {
        await expect(safeFetch('file:///etc/passwd', 1024, '*/*')).rejects.toThrow('BAD_URL')
        await expect(safeFetch('http://user:pw@example.com/', 1024, '*/*')).rejects.toThrow('BAD_URL')
    })
})

describe('guardedLookup', () => {
    afterEach(() => { vi.restoreAllMocks() })

    const run = (all: boolean) => new Promise<{ err: unknown; address: unknown }>((resolve) =>
        guardedLookup('example.com', { all }, (err, address) => resolve({ err, address })))

    it('passes public answers through in both callback shapes', async () => {
        vi.spyOn(dns, 'lookup').mockImplementation(((_h: string, _o: unknown, cb: Function) =>
            cb(null, [{ address: '93.184.215.14', family: 4 }])) as any)
        expect((await run(true)).address).toEqual([{ address: '93.184.215.14', family: 4 }])
        expect((await run(false)).address).toBe('93.184.215.14')
    })

    it('fails the whole lookup if any answer is private', async () => {
        vi.spyOn(dns, 'lookup').mockImplementation(((_h: string, _o: unknown, cb: Function) =>
            cb(null, [{ address: '93.184.215.14', family: 4 }, { address: '10.0.0.5', family: 4 }])) as any)
        expect(((await run(true)).err as Error).message).toBe('BAD_URL')
    })
})
