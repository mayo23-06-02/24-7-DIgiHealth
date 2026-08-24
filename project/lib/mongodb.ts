import mongoose from 'mongoose';
import { after } from 'next/server';
import { installObjectIdGuard } from '@/lib/db/objectIdGuard';
import { runPendingMigrations } from '@/lib/migrations';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digihealth';

// Registered at module scope so the global plugin lands before most model
// modules are evaluated; connectToDatabase() re-runs it to sweep any schema
// that compiled first. See lib/db/objectIdGuard.ts.
installObjectIdGuard();

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
  // Cheap and idempotent; catches models that compiled before this module ran.
  installObjectIdGuard();

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  cached.conn = await cached.promise;

  /*
   * First database contact after a deploy is what triggers pending migrations.
   *
   * Not awaited: a migration is maintenance, and the request that happened to
   * be first through the door should not wait on it — or fail with it. The
   * runner swallows its own errors and claims its work in the database, so
   * this stays safe to fire from every instance that starts up.
   *
   * Handed to `after` rather than simply floated, because a floated promise on
   * a serverless platform is only as alive as the invocation that started it:
   * the instance may be frozen the moment the response is sent, suspending the
   * migration mid-flight and leaving its claim row saying "running" until the
   * lease expires. `after` keeps the invocation open until the work finishes.
   * Outside a request — scripts, seeds, tests — it throws, and floating it is
   * then exactly right.
   */
  try {
    after(() => runPendingMigrations());
  } catch {
    void runPendingMigrations();
  }

  return cached.conn;
}
