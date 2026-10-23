import { describe, it, expect } from 'vitest'
import { parseSpokenItems } from '../../api/src/services/voice.service.js'

describe('parseSpokenItems', () => {
    it('splits a spoken list with quantities', () => {
        expect(parseSpokenItems('Add milk, 2 eggs and a dozen bagels to my list')).toEqual([
            { name: 'milk', quantity: 1 },
            { name: 'eggs', quantity: 2 },
            { name: 'bagels', quantity: 12 }
        ])
    })

    it('keeps known "X and Y" items whole', () => {
        expect(parseSpokenItems('mac and cheese and two half and half')).toEqual([
            { name: 'mac and cheese', quantity: 1 },
            { name: 'half and half', quantity: 2 }
        ])
    })

    it('uses the user\'s own compound names', () => {
        expect(parseSpokenItems('rice and Beans & Greens', ['Beans & Greens'])).toEqual([
            { name: 'rice', quantity: 1 },
            { name: 'beans & greens', quantity: 1 }
        ])
    })

    it('handles French separators', () => {
        expect(parseSpokenItems('lait et trois pommes')).toEqual([
            { name: 'lait', quantity: 1 },
            { name: 'pommes', quantity: 3 }
        ])
    })
})

describe('parseSpokenItems list names', () => {
    it('strips a trailing list name but not other phrases', () => {
        expect(parseSpokenItems('add milk to my grocery list')).toEqual([{ name: 'milk', quantity: 1 }])
        expect(parseSpokenItems('add eggs on the costco list')).toEqual([{ name: 'eggs', quantity: 1 }])
        expect(parseSpokenItems('add hot sauce on the side')).toEqual([{ name: 'hot sauce on the side', quantity: 1 }])
    })
})
