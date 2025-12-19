import { Hono } from "hono";

const usersRoute = new Hono();

usersRoute.post('/', async () => {

});

usersRoute.get('/', async () => {

});

usersRoute.patch('/:id', async () => {

});

usersRoute.delete('/', async () => {

});

export default usersRoute;