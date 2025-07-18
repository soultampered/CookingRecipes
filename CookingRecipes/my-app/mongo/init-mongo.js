// mongo/init-mongo.js

db = db.getSiblingDB('myapp');

db.createCollection("recipes");
db.recipes.insertMany([
    { title: "Pancakes", ingredients: ["flour", "eggs", "milk"] },
    { title: "Omelette", ingredients: ["eggs", "cheese", "spinach"] }
]);

db.createCollection("users");
db.users.insertOne({ username: "admin", role: "owner" });
