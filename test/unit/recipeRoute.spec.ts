import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Auth is covered elsewhere; here every request is signed in as u1 and verified.
vi.mock('../../api/src/middleware/auth.middleware.js', () => ({
    authMiddleware: async (c: any, next: any) => { c.set('userId', 'u1'); await next() }
}))
vi.mock('../../api/src/middleware/requireVerified.middleware.js', () => ({
    requireVerified: async (_c: any, next: any) => { await next() }
}))

const recipes: Record<string, any> = {
    '123': { _id: '123', userId: 'u1', name: 'Example Recipe', ingredients: [{ _id: 'inv1', quantity: 2 }] },
    '456': { _id: '456', userId: 'u2', name: 'Someone Else', ingredients: [] }
}

vi.mock('../../api/src/services/recipes.service.js', () => ({
    recipeService: {
        getAllRecipes: vi.fn(async (userId: string) => Object.values(recipes).filter(r => r.userId === userId)),
        createRecipe: vi.fn(async (recipe: any) => ({ ...recipe, _id: '2' })),
        getRecipeById: vi.fn(async (id: string) => {
            if (!recipes[id]) throw new Error('NOT_FOUND')
            return recipes[id]
        }),
        updateRecipe: vi.fn(async (id: string, data: any) => ({ ...recipes[id], ...data })),
        deleteRecipe: vi.fn(async () => undefined)
    }
}))

vi.mock('../../api/src/services/recipeInventory.service.js', () => ({
    recipeInventoryService: {
        deductIngredients: vi.fn(async () => ({ adjustments: [{ id: 'inv1', amount: -2 }], updatedInventory: [] })),
        getMissingIngredients: vi.fn(async () => []),
        suggestRecipes: vi.fn(async () => [])
    }
}))

import recipeRoutes from '../../api/src/routes/recipes.route.js'
import { recipeService } from '../../api/src/services/recipes.service.js'
import { recipeInventoryService } from '../../api/src/services/recipeInventory.service.js'
import { featuresService } from '../../api/src/services/features.service.js'

describe('Recipe routes', () => {
    let app: Hono

    beforeEach(() => {
        vi.clearAllMocks()
        app = new Hono().route('/recipes', recipeRoutes)
    })

    const json = (method: string, body: unknown) => ({
        method,
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
    })

    it('GET /recipes lists only the caller\'s recipes', async () => {
        const res = await app.request('/recipes')
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual([recipes['123']])
    })

    const tacos = { title: 'Tacos', author: 'Me', ingredients: [], instructions: ['Cook'], nutrition: [], difficulty: 'easy' }

    it('POST /recipes creates a recipe owned by the caller', async () => {
        const res = await app.request('/recipes', json('POST', { ...tacos, userId: 'u2' }))
        expect(res.status).toBe(201)
        expect(vi.mocked(recipeService.createRecipe).mock.calls[0][0]).toMatchObject({ title: 'Tacos', userId: 'u1' })
    })

    it('POST /recipes rejects an invalid body', async () => {
        const res = await app.request('/recipes', json('POST', { title: '' }))
        expect(res.status).toBe(400)
        expect(recipeService.createRecipe).not.toHaveBeenCalled()
    })

    it('GET /recipes/:id fetches a single recipe', async () => {
        const res = await app.request('/recipes/123')
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual(recipes['123'])
    })

    it('GET /recipes/:id returns 404 for a missing recipe', async () => {
        const res = await app.request('/recipes/999')
        expect(res.status).toBe(404)
        expect(await res.json()).toEqual({ error: 'Recipe not found' })
    })

    it('GET /recipes/:id returns 403 for another user\'s recipe', async () => {
        const res = await app.request('/recipes/456')
        expect(res.status).toBe(403)
    })

    it('PATCH /recipes/:id updates a recipe', async () => {
        const res = await app.request('/recipes/123', json('PATCH', { title: 'Updated Recipe' }))
        expect(res.status).toBe(200)
        expect((await res.json()).title).toBe('Updated Recipe')
    })

    it('PATCH /recipes/:id ignores rating fields while ratings is off', async () => {
        featuresService.setOverrides({ ratings: false })
        try {
            await app.request('/recipes/123', json('PATCH', { title: 'T', rating: 5, favorite: true }))
            expect(vi.mocked(recipeService.updateRecipe).mock.calls[0][1]).toEqual({ title: 'T' })
        } finally {
            featuresService.setOverrides(null)
        }
    })

    it('PATCH /recipes/:id returns 404 if not found', async () => {
        const res = await app.request('/recipes/999', json('PATCH', { title: 'Updated Recipe' }))
        expect(res.status).toBe(404)
    })

    it('PATCH /recipes/:id refuses another user\'s recipe', async () => {
        const res = await app.request('/recipes/456', json('PATCH', { title: 'Mine now' }))
        expect(res.status).toBe(403)
        expect(recipeService.updateRecipe).not.toHaveBeenCalled()
    })

    it('DELETE /recipes/:id deletes a recipe', async () => {
        const res = await app.request('/recipes/123', { method: 'DELETE' })
        expect(res.status).toBe(204)
    })

    it('DELETE /recipes/:id returns 404 if not found', async () => {
        const res = await app.request('/recipes/999', { method: 'DELETE' })
        expect(res.status).toBe(404)
    })

    it('DELETE /recipes/:id refuses another user\'s recipe', async () => {
        const res = await app.request('/recipes/456', { method: 'DELETE' })
        expect(res.status).toBe(403)
        expect(recipeService.deleteRecipe).not.toHaveBeenCalled()
    })

    it('POST /recipes/:id/prepare deducts ingredients', async () => {
        const res = await app.request('/recipes/123/prepare', { method: 'POST' })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.adjustments).toEqual([{ id: 'inv1', amount: -2 }])
    })

    it('POST /recipes/:id/prepare passes scale through', async () => {
        const res = await app.request('/recipes/123/prepare', json('POST', { scale: 2 }))
        expect(res.status).toBe(200)
        expect(recipeInventoryService.deductIngredients).toHaveBeenCalledWith('123', 'u1', { scale: 2 })
    })

    it('POST /recipes/:id/prepare ignores scale while saferPrepare is off', async () => {
        featuresService.setOverrides({ saferPrepare: false })
        try {
            const res = await app.request('/recipes/123/prepare', json('POST', { scale: 2 }))
            expect(res.status).toBe(200)
            expect(recipeInventoryService.deductIngredients).toHaveBeenCalledWith('123', 'u1', {})
        } finally {
            featuresService.setOverrides(null)
        }
    })

    it('POST /recipes/:id/prepare returns 404 for a missing recipe', async () => {
        const res = await app.request('/recipes/999/prepare', { method: 'POST' })
        expect(res.status).toBe(404)
        expect(recipeInventoryService.deductIngredients).not.toHaveBeenCalled()
    })

    it('GET /recipes/:id/missing-ingredients returns missing ingredients', async () => {
        const res = await app.request('/recipes/123/missing-ingredients')
        expect(res.status).toBe(200)
        expect(Array.isArray(await res.json())).toBe(true)
    })

    it('GET /recipes/suggestions returns recipe suggestions', async () => {
        const res = await app.request('/recipes/suggestions')
        expect(res.status).toBe(200)
        expect(Array.isArray(await res.json())).toBe(true)
    })
})
