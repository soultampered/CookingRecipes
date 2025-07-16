import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error('MONGODB_URI not defined in .env');
}

const client = new MongoClient(uri);

let db: Db;

export const connectToDatabase = async (): Promise<Db> => {
    if (!db) {
        await client.connect();
        db = client.db('recipe-app');
        console.log('Connected to MongoDB');
    }
    return db;
};
