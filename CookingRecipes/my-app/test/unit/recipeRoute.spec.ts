import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import recipeRoutes from '../../src/routes/recipes.route.js'

// Mock the recipeModel
vi.mock('../../src/models/index.js', () => {
    return {
        recipeModel: {
            findAll: vi.fn(async () => [{ id: '1', name: 'Spaghetti Bolognese' }]),
            create: vi.fn(async (recipe: any) => recipe),
            findById: vi.fn(async (id: string) => {
                if (id === '123') return { id: '123', name: 'Example Recipe' }
                return null
            })
        }
    }
})

describe('Recipe routes', () => {
    let app: Hono

    beforeEach(() => {
        app = new Hono().route('/', recipeRoutes)
    })

    it('GET /recipes returns a list', async () => {
        const res = await app.request('/recipes')
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual([{ id: '1', name: 'Spaghetti Bolognese' }])
    })

    it('POST /recipes creates a recipe', async () => {
        const res = await app.request('/recipes', {
            method: 'POST',
            body: JSON.stringify({ id: '2', name: 'Tacos' }),
            headers: { 'Content-Type': 'application/json' }
        })
        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toEqual({ id: '2', name: 'Tacos' })
    })

    it('GET /recipes/:id fetches one recipe', async () => {
        const res = await app.request('/recipes/123')
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ id: '123', name: 'Example Recipe' })
    })
})
