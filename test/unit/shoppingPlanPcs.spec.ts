import { describe, it, expect, vi } from 'vitest'

const id = 'a'.repeat(24)
vi.mock('../../api/src/services/recipes.service.js', () => ({
    recipeService: { getRecipeById: vi.fn(async () => ({ _id: 'r1', userId: 'u1', title: 'Soup', ingredients: [{ inventoryItemId: id, quantity: 1.5, unit: 'pcs' }] })) }
}))
vi.mock('../../api/src/services/inventory.service.js', () => ({
    inventoryService: { getAllInventory: vi.fn(async () => [{ _id: id, name: 'Onion', unit: 'pcs', quantity: 1 }]) }
}))
vi.mock('../../api/src/services/shoppingList.service.js', () => ({ shoppingListService: {} }))
vi.mock('../../api/src/services/access.service.js', () => ({
    accessService: { assertPantry: vi.fn(async () => undefined), canAccess: vi.fn(async () => true) }
}))
vi.mock('../../api/src/models/inventory.model.js', () => ({ inventoryModel: { findByIds: vi.fn(async () => []) } }))

import { shoppingPlanService } from '../../api/src/services/shoppingPlan.service.js'

describe('shoppingPlanService buy amounts', () => {
    it('rounds counted items up: needing 1.5 onions with 1 on hand means buying 1, not ½', async () => {
        const [onion] = await shoppingPlanService.plan('u1', [{ recipeId: 'r1' }])
        expect(onion.toBuy).toBe(1)
    })
})
