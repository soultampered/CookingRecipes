import { describe, it, expect, vi, beforeEach } from 'vitest'

const recipe = {
    _id: 'r1',
    userId: 'u1',
    ingredients: [
        { inventoryItemId: 'a'.repeat(24), quantity: 2 },
        { inventoryItemId: 'b'.repeat(24), quantity: 1 },
        { inventoryItemId: 'a'.repeat(24), quantity: 3 }
    ]
}

vi.mock('../../api/src/services/recipes.service.js', () => ({
    recipeService: { getRecipeById: vi.fn(async () => recipe) }
}))
vi.mock('../../api/src/services/inventory.service.js', () => ({
    inventoryService: { applyAdjustments: vi.fn(async () => []), getInventoryItemsByIds: vi.fn(async () => []) }
}))

import { recipeInventoryService } from '../../api/src/services/recipeInventory.service.js'

describe('recipeInventoryService.deductIngredients', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('scales every row', async () => {
        const { adjustments } = await recipeInventoryService.deductIngredients('r1', 'u1', { scale: 2 })
        expect(adjustments.map((a) => a.amount)).toEqual([-4, -2, -6])
    })

    it('applies an override to its own row when an item is listed twice', async () => {
        const { adjustments } = await recipeInventoryService.deductIngredients('r1', 'u1', {
            overrides: [{ inventoryItemId: 'a'.repeat(24), index: 2, quantity: 0.5 }]
        })
        expect(adjustments.map((a) => a.amount)).toEqual([-2, -1, -0.5])
    })

    it('still accepts item-keyed overrides from older builds', async () => {
        const { adjustments } = await recipeInventoryService.deductIngredients('r1', 'u1', {
            overrides: [{ inventoryItemId: 'b'.repeat(24), quantity: 0 }]
        })
        expect(adjustments.map((a) => a.amount)).toEqual([-2, -0, -3])
    })
})

describe('recipeInventoryService leftovers', () => {
    it('reports a failed leftover save instead of throwing after stock was deducted', async () => {
        const { inventoryService } = await import('../../api/src/services/inventory.service.js')
        ;(inventoryService as any).createLeftover = vi.fn(async () => { throw new Error('db down') })
        const result = await recipeInventoryService.deductIngredients('r1', 'u1', { leftovers: { servings: 2, expiresInDays: 3 } })
        expect(result.leftoverFailed).toBe(true)
        expect(inventoryService.applyAdjustments).toHaveBeenCalledOnce()
    })
})

describe('recipeInventoryService.getMissingIngredients units', () => {
    it('compares in the stock unit', async () => {
        const { recipeService } = await import('../../api/src/services/recipes.service.js')
        const { inventoryService } = await import('../../api/src/services/inventory.service.js')
        vi.mocked(recipeService.getRecipeById).mockResolvedValueOnce({
            _id: 'r9', userId: 'u1', ingredients: [
                { inventoryItemId: 'a'.repeat(24), quantity: 1, unit: 'kg' },
                { inventoryItemId: 'b'.repeat(24), quantity: 2, unit: 'cup' }
            ]
        } as any)
        ;(inventoryService as any).getInventoryItemsByIds = vi.fn(async () => [
            { _id: 'a'.repeat(24), name: 'Flour', unit: 'g', quantity: 500 },
            { _id: 'b'.repeat(24), name: 'Rice', unit: 'g', quantity: 900 }
        ])
        const missing = await recipeInventoryService.getMissingIngredients('r9')
        // 1 kg needed, 500 g on hand → 500 g short; cup vs g can't convert but stock exists → not flagged
        expect(missing).toEqual([{ name: 'Flour', needed: 500, unit: 'g' }])
    })
})

describe('recipeInventoryService.deductIngredients default amounts', () => {
    it('converts the recipe unit into the stock unit when there is no override', async () => {
        const { recipeService } = await import('../../api/src/services/recipes.service.js')
        const { inventoryService } = await import('../../api/src/services/inventory.service.js')
        vi.mocked(recipeService.getRecipeById).mockResolvedValueOnce({
            _id: 'r5', userId: 'u1', ingredients: [{ inventoryItemId: 'c'.repeat(24), quantity: 0.5, unit: 'kg' }]
        } as any)
        ;(inventoryService as any).getInventoryItemsByIds = vi.fn(async () => [{ _id: 'c'.repeat(24), name: 'Flour', unit: 'g', quantity: 1000 }])
        const { adjustments } = await recipeInventoryService.deductIngredients('r5', 'u1')
        expect(adjustments).toEqual([{ id: 'c'.repeat(24), amount: -500 }])
    })
})
