import { describe, it, expect } from 'vitest'
import { stripImageMetadata } from '../../api/src/services/imageMetadata.js'

const seg = (marker: number, payload: string) => {
    const body = Buffer.from(payload, 'latin1')
    const head = Buffer.from([0xff, marker, 0, 0])
    head.writeUInt16BE(body.length + 2, 2)
    return Buffer.concat([head, body])
}

describe('stripImageMetadata', () => {
    it('drops JPEG Exif/XMP/comment segments and keeps the rest', () => {
        const jpeg = Buffer.concat([
            Buffer.from([0xff, 0xd8]),
            seg(0xe0, 'JFIF\0keep'),
            seg(0xe1, 'Exif\0\0GPSLatitude 43.65'),
            seg(0xfe, 'my kitchen'),
            seg(0xe2, 'ICC_PROFILE\0\x01\x01display-p3'),
            seg(0xe2, 'MPF\0multi-picture'),
            seg(0xdb, 'quant-table'),
            Buffer.from([0xff, 0xda, 0, 2]), Buffer.from('scan-data', 'latin1'), Buffer.from([0xff, 0xd9])
        ])
        const out = stripImageMetadata(jpeg, 'image/jpeg').toString('latin1')
        expect(out).not.toContain('GPSLatitude')
        expect(out).not.toContain('my kitchen')
        expect(out).toContain('JFIF')
        expect(out).toContain('display-p3')
        expect(out).not.toContain('multi-picture')
        expect(out).toContain('quant-table')
        expect(out).toContain('scan-data')
    })

    it('drops PNG text/eXIf chunks', () => {
        const chunk = (type: string, data: string) => {
            const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
            return Buffer.concat([len, Buffer.from(type + data, 'latin1'), Buffer.alloc(4)])
        }
        const png = Buffer.concat([
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            chunk('IHDR', 'hdr'), chunk('tEXt', 'Author\0me'), chunk('eXIf', 'GPS'), chunk('IDAT', 'pix'), chunk('IEND', '')
        ])
        const out = stripImageMetadata(png, 'image/png').toString('latin1')
        expect(out).not.toContain('Author')
        expect(out).not.toContain('GPS')
        expect(out).toContain('IDAT')
        expect(out).toContain('IEND')
    })

    it('drops WebP EXIF chunks and fixes the RIFF size', () => {
        const chunk = (type: string, data: string) => {
            const len = Buffer.alloc(4); len.writeUInt32LE(data.length)
            return Buffer.concat([Buffer.from(type, 'latin1'), len, Buffer.from(data + (data.length % 2 ? '\0' : ''), 'latin1')])
        }
        const body = Buffer.concat([chunk('VP8X', '\x08\0\0\0\0\0\0\0\0\0'), chunk('VP8 ', 'pixels'), chunk('EXIF', 'GPS!')])
        const head = Buffer.from('RIFF0000WEBP', 'latin1'); head.writeUInt32LE(4 + body.length, 4)
        const out = stripImageMetadata(Buffer.concat([head, body]), 'image/webp')
        expect(out.toString('latin1')).not.toContain('GPS!')
        expect(out.readUInt32LE(4)).toBe(out.length - 8)
        expect(out[20] & 0x08).toBe(0)
    })
})
