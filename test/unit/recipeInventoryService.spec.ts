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
    inventoryService: { applyAdjustments: vi.fn(async () => []) }
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
