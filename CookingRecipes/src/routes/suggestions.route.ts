import { Hono } from "hono";


const suggestionsRoute = new Hono();

suggestionsRoute.get('/', async () => {

});
export default suggestionsRoute;