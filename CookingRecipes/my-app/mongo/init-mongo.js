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
db.users.insertOne({
    username: "johndoe",
    email: "john@example.com",
    passwordHash: "$2b$10$fakehashedpasswordhere",
    displayName: "John D.",
    avatarUrl: "https://example.com/avatars/johndoe.jpg",
    bio: "Foodie and weekend chef.",
    savedRecipes: [],
    createdRecipes: [],
    preferences: {
        dietaryRestrictions: ["vegetarian"],
        preferredUnits: "metric",
        theme: "dark"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
});

db.createCollection("inventory");
db.inventory.insertMany([
    {
        name: 'Carrots',
        quantity: 5,
        unit: 'pcs',
        category: 'Produce',
        expirationDate: new Date('2025-08-01'),
        notes: 'Organic, from local market',
    },
    {
        name: 'Chicken Breast',
        quantity: 2,
        unit: 'lbs',
        category: 'Meat & Poultry',
        expirationDate: new Date('2025-07-25'),
    },
    {
        name: 'Milk',
        quantity: 1,
        unit: 'liter',
        category: 'Dairy',
        expirationDate: new Date('2025-07-21'),
    },
    {
        name: 'Brown Rice',
        quantity: 1,
        unit: 'kg',
        category: 'Grains & Pasta',
    },
    {
        name: 'Olive Oil',
        quantity: 500,
        unit: 'ml',
        category: 'Oils & Fats',
    },
    {
        name: 'Salt',
        quantity: 1,
        unit: 'kg',
        category: 'Spices & Seasonings',
    },
    {
        name: 'Frozen Peas',
        quantity: 1,
        unit: 'bag',
        category: 'Frozen',
        expirationDate: new Date('2026-01-01'),
    },
    {
        name: 'Tomato Sauce',
        quantity: 2,
        unit: 'can',
        category: 'Canned & Jarred',
        expirationDate: new Date('2025-12-15'),
    },
    {
        name: 'Eggs',
        quantity: 12,
        unit: 'pcs',
        category: 'Eggs',
        expirationDate: new Date('2025-07-22'),
    },
    {
        name: 'Black Pepper',
        quantity: 100,
        unit: 'g',
        category: 'Spices & Seasonings',
    },
]);
