import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ObjectId } from 'mongodb'
import type { ShoppingList } from '../../api/src/types/shoppingList.js'

vi.mock('../../api/src/models/index.js', () => {
    return {
        shoppingListModel: {
            findById: vi.fn(),
            update: vi.fn(async (_id: string, data: Partial<ShoppingList>) => ({ ...data }))
        }
    }
})

vi.mock('../../api/src/services/foodCategory.service.js', () => ({
    categorizeItemName: vi.fn(async () => 'Dairy')
}))

import { shoppingListModel } from '../../api/src/models/index.js'
import { shoppingListService } from '../../api/src/services/shoppingList.service.js'

describe('shoppingListService.addItem', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('merges quantity into an existing case-insensitive name match instead of duplicating', async () => {
        const existingId = new ObjectId()
        vi.mocked(shoppingListModel.findById).mockResolvedValue({
            _id: new ObjectId(),
            name: 'Groceries',
            userId: 'user1',
            items: [{ _id: existingId, name: 'milk', quantity: 1 }]
        } as ShoppingList)

        const result = await shoppingListService.addItem('list1', { name: 'Milk', quantity: 2 })

        expect(result.items).toHaveLength(1)
        expect(result.items[0]).toMatchObject({ _id: existingId, name: 'milk', quantity: 3 })
    })

    it('adds a new row when no matching name exists', async () => {
        vi.mocked(shoppingListModel.findById).mockResolvedValue({
            _id: new ObjectId(),
            name: 'Groceries',
            userId: 'user1',
            items: [{ _id: new ObjectId(), name: 'Eggs', quantity: 1 }]
        } as ShoppingList)

        const result = await shoppingListService.addItem('list1', { name: 'Milk', quantity: 2 })

        expect(result.items).toHaveLength(2)
        expect(result.items[1]).toMatchObject({ name: 'Milk', quantity: 2, category: 'Dairy' })
    })
})
