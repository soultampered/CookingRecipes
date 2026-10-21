import { describe, it, expect, vi } from 'vitest'

const id = 'a'.repeat(24)
vi.mock('../../api/src/services/recipes.service.js', () => ({
    recipeService: { getRecipeById: vi.fn(async (rid: string) => ({
        _id: rid, userId: 'u1', title: rid,
        ingredients: rid === 'r1' ? [{ inventoryItemId: id, quantity: 200, unit: 'g' }] : [{ inventoryItemId: id, quantity: 2, unit: 'cup' }]
    })) }
}))
vi.mock('../../api/src/services/inventory.service.js', () => ({
    inventoryService: { getAllInventory: vi.fn(async () => [{ _id: id, name: 'Flour', unit: 'g', quantity: 100 }]) }
}))
vi.mock('../../api/src/services/shoppingList.service.js', () => ({ shoppingListService: {} }))

import { shoppingPlanService } from '../../api/src/services/shoppingPlan.service.js'

describe('shoppingPlanService.plan units', () => {
    it('keeps amounts that can\'t convert out of the total', async () => {
        const [flour] = await shoppingPlanService.plan('u1', [{ recipeId: 'r1' }, { recipeId: 'r2' }])
        expect(flour).toMatchObject({ needed: 200, toBuy: 100, unitMismatch: true, unconverted: [{ quantity: 2, unit: 'cup' }] })
    })
})
