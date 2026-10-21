import { MongoClient } from 'mongodb';

// Created on first use so importing a model doesn't require MONGO_URI (unit tests).
let client: MongoClient | undefined;

export const connectToDatabase = async () => {
    if (!client) {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error('MONGO_URI not defined');
        client = new MongoClient(uri);
    }
    await client.connect();
    return client.db();
};
