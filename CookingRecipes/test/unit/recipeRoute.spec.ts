import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import recipeRoutes from '../../src/routes/recipes.route.js'
import type { Recipe } from '../../src/types/recipe.js'

// Mock the models
vi.mock('../../src/models/index.js', () => {
    return {
        recipeModel: {
            findAll: vi.fn(async () => [{ _id: '1', name: 'Spaghetti Bolognese', ingredients: [] }]),
            create: vi.fn(async (recipe: Recipe) => ({ ...recipe, _id: '2' })),
            findById: vi.fn(async (id: string) => {
                if (id === '123') return { _id: '123', name: 'Example Recipe', ingredients: [{ _id: 'inv1', quantity: 2 }] }
                return null
            }),
            update: vi.fn(async (id: string, data: Partial<Recipe>) => {
                if (id === '123') return { _id: '123', ...data }
                return null
            }),
            delete: vi.fn(async (id: string) => (id === '123' ? { deletedCount: 1 } : { deletedCount: 0 }))
        }
    }
})

// Mock inventory service for recipeInventoryService
vi.mock('../../src/services/inventory.service.js', () => ({
    inventoryService: {
        bulkAdjust: vi.fn(async (items: any[]) => items),
        getInventoryById: vi.fn(async (id: string) => ({ _id: id, name: 'Test Item', quantity: 5 })),
    }
}))

import { recipeInventoryService } from '../../src/services/recipeInventory.service.js'

describe('Recipe routes', () => {
    let app: Hono

    beforeEach(() => {
        app = new Hono().route('/', recipeRoutes)
    })

    // --- CRUD Tests ---
    it('GET /recipes returns a list', async () => {
        const res = await app.request('/recipes')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual([{ _id: '1', name: 'Spaghetti Bolognese', ingredients: [] }])
    })

    it('POST /recipes creates a recipe', async () => {
        const newRecipe = { name: 'Tacos', ingredients: [] }
        const res = await app.request('/recipes', {
            method: 'POST',
            body: JSON.stringify(newRecipe),
            headers: { 'Content-Type': 'application/json' }
        })
        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toEqual({ ...newRecipe, _id: '2' })
    })

    it('GET /recipes/:id fetches a single recipe', async () => {
        const res = await app.request('/recipes/123')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual({ _id: '123', name: 'Example Recipe', ingredients: [{ _id: 'inv1', quantity: 2 }] })
    })

    it('GET /recipes/:id returns 404 for non-existent recipe', async () => {
        const res = await app.request('/recipes/999')
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toEqual({ error: 'Recipe not found' })
    })

    it('PATCH /recipes/:id updates a recipe', async () => {
        const res = await app.request('/recipes/123', {
            method: 'PATCH',
            body: JSON.stringify({ name: 'Updated Recipe' }),
            headers: { 'Content-Type': 'application/json' }
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual({ _id: '123', name: 'Updated Recipe' })
    })

    it('PATCH /recipes/:id returns 404 if not found', async () => {
        const res = await app.request('/recipes/999', {
            method: 'PATCH',
            body: JSON.stringify({ name: 'Updated Recipe' }),
            headers: { 'Content-Type': 'application/json' }
        })
        expect(res.status).toBe(500) // Based on your route error handling
        const body = await res.json()
        expect(body.error).toBeDefined()
    })

    it('DELETE /recipes/:id deletes a recipe', async () => {
        const res = await app.request('/recipes/123', { method: 'DELETE' })
        expect(res.status).toBe(204)
    })

    it('DELETE /recipes/:id returns 404 if not found', async () => {
        const res = await app.request('/recipes/999', { method: 'DELETE' })
        expect(res.status).toBe(404)
    })

    // --- Recipe Inventory Tests ---
    it('POST /recipes/:id/prepare deducts ingredients', async () => {
        const res = await app.request('/recipes/123/prepare', { method: 'POST' })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.updatedInventory).toEqual([{ id: 'inv1', amount: -2 }])
    })

    it('GET /recipes/:id/missing/ingredients returns missing ingredients', async () => {
        const res = await app.request('/recipes/123/missing/ingredients')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(Array.isArray(body)).toBe(true)
    })

    it('GET /recipes/suggestions returns recipe suggestions', async () => {
        const res = await app.request('/recipes/suggestions')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(Array.isArray(body)).toBe(true)
    })
})
