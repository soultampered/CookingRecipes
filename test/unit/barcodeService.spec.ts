import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('../../api/src/services/foodCategory.service.js', () => ({ categorizeItemName: vi.fn(async () => 'Pantry') }))

import { barcodeService } from '../../api/src/services/barcode.service.js'

const off = (product?: { product_name: string }) =>
    new Response(JSON.stringify(product ? { status: 1, product } : { status: 0 }), { status: product ? 200 : 404 })

describe('barcodeService.lookup cache', () => {
    afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

    it('retries a miss after a day', async () => {
        vi.useFakeTimers()
        const fetchMock = vi.fn().mockResolvedValueOnce(off()).mockResolvedValueOnce(off({ product_name: 'Oat milk' }))
        vi.stubGlobal('fetch', fetchMock)
        expect(await barcodeService.lookup('0001')).toBeNull()
        expect(await barcodeService.lookup('0001')).toBeNull()
        expect(fetchMock).toHaveBeenCalledTimes(1)
        vi.advanceTimersByTime(25 * 60 * 60 * 1000)
        expect((await barcodeService.lookup('0001'))?.name).toBe('Oat milk')
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })
})
