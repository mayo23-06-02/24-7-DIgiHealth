import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digihealth';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend global to hold the mongoose cache
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache;
}

let cached: MongooseCache = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
