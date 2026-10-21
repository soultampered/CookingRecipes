import { describe, it, expect } from 'vitest'
import { wholeWordMatch } from '../../api/src/services/recipeImport.service.js'

const inv = ['Salt', 'Butter', 'Peanut Butter', 'Egg', 'Oil', 'Crème fraîche'].map((name) => ({ name }))
const match = (s: string) => wholeWordMatch(s, inv)?.name

describe('wholeWordMatch', () => {
    it('ignores names inside other words', () => {
        expect(match('unsalted butter')).toBe('Butter')
        expect(match('eggplant')).toBeUndefined()
        expect(match('boiled potatoes')).toBeUndefined()
    })

    it('prefers the longest whole-word name', () => {
        expect(match('crunchy peanut butter')).toBe('Peanut Butter')
    })

    it('allows a plural s and accented names', () => {
        expect(match('large eggs, beaten')).toBe('Egg')
        expect(match('crème fraîche')).toBe('Crème fraîche')
    })
})
