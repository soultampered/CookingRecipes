import { Hono } from 'hono';
import type { ShoppingList } from "../types/shoppingList.js"
import { shoppingListService } from "../services/shoppingList.service.js"

const shoppingListRoute = new Hono();

shoppingListRoute.get('/', async (c) => {

});

shoppingListRoute.post('/', async (c) => {

});

shoppingListRoute.get('/:id', async (c) => {

});
shoppingListRoute.patch('/:id', async (c) => {

});

shoppingListRoute.delete('/:id', async (c) => {

});

shoppingListRoute.post('/:id/items', async (c) => {

});

shoppingListRoute.delete('/:id/items/itemId', async (c) => {

});

shoppingListRoute.post('/:id/checkout', async (c) => {

});

export default shoppingListRoute;