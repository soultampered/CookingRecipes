import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI;

if (!uri) {
    throw new Error('MONGO_URI not defined');
}

const client = new MongoClient(uri);

export const connectToDatabase = async () => {
    await client.connect();
    return client.db();
};
