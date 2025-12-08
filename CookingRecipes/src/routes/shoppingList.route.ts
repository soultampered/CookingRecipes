import { Hono } from 'hono';
import type { ShoppingList } from "../types/shoppingList.js"
import { shoppingListService } from "../services/shoppingList.service.js"

const shoppingListRoute = new Hono();

shoppingListRoute.get('/shopping-lists', async (c) => {

});

shoppingListRoute.post('/shopping-lists', async (c) => {

});

shoppingListRoute.get('/shopping-lists/:id', async (c) => {

});
shoppingListRoute.patch('/shopping-lists/:id', async (c) => {

});

shoppingListRoute.delete('/shopping-lists/:id', async (c) => {

});

shoppingListRoute.post('/shopping-lists/:id/items', async (c) => {

});

shoppingListRoute.delete('/shopping-lists/:id/items/itemId', async (c) => {

});

shoppingListRoute.post('/shopping-lists/:id/checkout', async (c) => {

});