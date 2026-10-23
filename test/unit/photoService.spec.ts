import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/src/models/photo.model.js', () => ({
    photoModel: {
        save: vi.fn(async () => undefined),
        usageBytes: vi.fn(async () => 0),
        tokensUploadedBefore: vi.fn(async () => [] as string[]),
        referencedTokens: vi.fn(async () => new Set<string>()),
        delete: vi.fn(async () => undefined)
    }
}))

import { photoModel } from '../../api/src/models/photo.model.js'
import { photoService, MAX_USER_PHOTO_BYTES } from '../../api/src/services/photo.service.js'

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])

describe('photoService.upload', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('stores a JPEG under the quota', async () => {
        const token = await photoService.upload('u1', jpeg)
        expect(token).toMatch(/^[0-9a-f]{32}$/)
        expect(photoModel.save).toHaveBeenCalledOnce()
    })

    it('refuses an upload that would pass the per-user cap', async () => {
        vi.mocked(photoModel.usageBytes).mockResolvedValueOnce(MAX_USER_PHOTO_BYTES - 4)
        await expect(photoService.upload('u1', jpeg)).rejects.toThrow('QUOTA')
        expect(photoModel.save).not.toHaveBeenCalled()
    })
})

describe('photoService.sweepOrphans', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('deletes only old uploads nothing references', async () => {
        vi.mocked(photoModel.tokensUploadedBefore).mockResolvedValueOnce(['a', 'b', 'c'])
        vi.mocked(photoModel.referencedTokens).mockResolvedValueOnce(new Set(['b']))
        expect(await photoService.sweepOrphans(Date.UTC(2026, 9, 21))).toBe(2)
        expect(vi.mocked(photoModel.delete).mock.calls.map((c) => c[0])).toEqual(['a', 'c'])
        // 24h grace for uploads whose recipe/item hasn't been saved yet
        expect(vi.mocked(photoModel.tokensUploadedBefore).mock.calls[0][0]).toEqual(new Date(Date.UTC(2026, 9, 20)))
    })

    it('does nothing when there are no old uploads', async () => {
        expect(await photoService.sweepOrphans()).toBe(0)
        expect(photoModel.referencedTokens).not.toHaveBeenCalled()
    })
})
