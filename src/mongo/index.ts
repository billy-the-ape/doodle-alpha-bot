import { Collection, MongoClient } from 'mongodb';
import {
  CachedType,
  CollectionTypeMap,
  Drop,
  Server,
  StoredUser,
} from './types';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongo as CachedType;

if (!cached) {
  cached = (global as any).mongo = { conn: null, promise: null };
}

const connectToDatabase = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  }
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxIdleTimeMS: 10000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    };
    const dbName = new URL(process.env.MONGODB_URI!).pathname.substr(1);
    cached.promise = MongoClient.connect(MONGODB_URI, opts).then((client) => {
      return {
        client,
        db: client.db(dbName),
      };
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
};

const getCollection = async <TKey extends keyof CollectionTypeMap>(
  key: TKey
) => {
  const db = (await connectToDatabase()).db;
  return db.collection(key) as Collection<CollectionTypeMap[TKey]>;
};

export const getActiveWhitelists = async () => {
  const collection = await getCollection('whitelist');
  return await collection.find({ completed: false }).toArray();
};

export const addWhitelist = async (whitelist: Drop): Promise<Drop> => {
  const collection = await getCollection('whitelist');
  whitelist.completed = false;
  await collection.insertOne(whitelist);
  return whitelist;
};

export const removeWhitelist = async (_id: string) => {
  const collection = await getCollection('whitelist');
  await collection.deleteOne({ _id });
};

export const completeWhitelist = async (
  _id: string,
  winners: StoredUser[],
  entries: StoredUser[]
) => {
  const collection = await getCollection('whitelist');
  await collection.updateOne({ _id }, { completed: true, winners, entries });
  // await collection.deleteOne({ _id });
};

export const getServer = async (_id: string) => {
  const collection = await getCollection('server');
  return await collection.findOne({ _id });
};

export const upsertServer = async (server: Server) => {
  const collection = await getCollection('server');

  await collection.updateOne({ _id: server._id }, server, { upsert: true });
};

export const addToServer = async (
  serverId: string,
  userFragment: Record<string, string>
) => {
  const collection = await getCollection('server');

  await collection.updateOne(
    { _id: serverId },
    { $set: userFragment },
    { upsert: true }
  );
};
