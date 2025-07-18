// mongo/init-mongo.js

db = db.getSiblingDB('myapp');

db.createCollection("recipes");

db.recipes.insertMany([
    {
        title: "Classic Pancakes",
        description: "Fluffy pancakes perfect for any morning.",
        ingredients: [
            { name: "Flour", quantity: 1.5, unit: "cups" },
            { name: "Milk", quantity: 1.25, unit: "cups" },
            { name: "Egg", quantity: 1 },
            { name: "Baking Powder", quantity: 3.5, unit: "tsp" },
            { name: "Salt", quantity: 0.5, unit: "tsp" }
        ],
        instructions: [
            "Mix dry ingredients together.",
            "Whisk in wet ingredients until just combined.",
            "Pour onto hot griddle and cook until bubbles form, then flip."
        ],
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        totalTimeMinutes: 25,
        servings: 4,
        tags: ["breakfast", "easy"],
        imageUrl: "https://example.com/images/pancakes.jpg",
        authorId: "user123",
        nutritionFacts: {
            calories: 250,
            fat: 6,
            protein: 7,
            carbs: 40
        },
        difficultyLevel: "easy",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
]);


db.createCollection("users");
db.users.insertOne({ username: "admin", role: "owner" });
