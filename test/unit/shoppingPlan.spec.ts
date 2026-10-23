import { describe, it, expect, vi } from 'vitest'

const id = (c: string) => c.repeat(24)
// u1's chili uses u1's personal Beans and Rice; u2's pantry (h1) has its own Rice.
const chili = { _id: 'r1', userId: 'u1', householdId: 'h1', title: 'Chili', ingredients: [
    { inventoryItemId: id('a'), quantity: 2 },
    { inventoryItemId: id('b'), quantity: 1 }
] }

vi.mock('../../api/src/services/recipes.service.js', () => ({
    recipeService: { getRecipeById: vi.fn(async () => chili) }
}))
vi.mock('../../api/src/services/access.service.js', () => ({
    accessService: { assertPantry: vi.fn(async () => undefined), canAccess: vi.fn(async () => true) }
}))
vi.mock('../../api/src/services/inventory.service.js', () => ({
    inventoryService: { getAllInventory: vi.fn(async () => [{ _id: id('c'), name: 'rice', unit: 'pcs', quantity: 3 }]) }
}))
vi.mock('../../api/src/models/inventory.model.js', () => ({
    inventoryModel: { findByIds: vi.fn(async () => [
        { _id: id('a'), name: 'Beans', unit: 'pcs', quantity: 10 },
        { _id: id('b'), name: 'Rice', unit: 'pcs', quantity: 10 }
    ]) }
}))
vi.mock('../../api/src/services/shoppingList.service.js', () => ({ shoppingListService: {} }))

import { shoppingPlanService } from '../../api/src/services/shoppingPlan.service.js'

describe('shoppingPlanService.plan for a shared recipe', () => {
    it('matches the other pantry\'s items by name and lists the rest to buy', async () => {
        const plan = await shoppingPlanService.plan('u2', [{ recipeId: 'r1' }], 'h1')
        const byName = Object.fromEntries(plan.map((p) => [p.name, p]))
        expect(byName.rice).toMatchObject({ inventoryItemId: id('c'), have: 3, toBuy: 0 })
        expect(byName.rice.notInPantry).toBeUndefined()
        // The owner's 10 Beans aren't in this pantry, so all 2 need buying.
        expect(byName.Beans).toMatchObject({ have: 0, toBuy: 2, notInPantry: true })
    })
})
