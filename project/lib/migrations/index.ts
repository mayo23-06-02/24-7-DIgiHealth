import Migration from "@/lib/models/Migration";
import { apiLogger } from "@/lib/apiLogger";
import { collapseDuplicateActiveCalls } from "./collapseDuplicateActiveCalls";

const scope = "migrations";

/**
 * How long a claim is honoured before another instance may take it over.
 *
 * A serverless instance can be killed mid-migration, leaving a row that says
 * "running" for ever and a migration that never completes. The lease means a
 * crashed attempt is retried rather than blocking the rest indefinitely, while
 * still being long enough that a slow-but-alive run is not trampled.
 */
const STALE_LEASE_MS = 10 * 60 * 1000;

interface MigrationDef {
  key: string;
  run: () => Promise<unknown>;
}

/**
 * Migrations that must run exactly once, in order.
 *
 * Add to the end; never rename or reuse a key, because the key is the record
 * of whether it already happened.
 */
const MIGRATIONS: MigrationDef[] = [
  {
    key: "2026-08-24-collapse-duplicate-active-calls",
    run: () =>
      collapseDuplicateActiveCalls({
        log: (line) => apiLogger.info(scope, "collapse_progress", { line }),
      }),
  },
];

/**
 * Try to become the one instance that runs this migration.
 *
 * Returns true for at most one caller. The insert is the claim: the unique
 * index on `key` means concurrent instances cannot both succeed, so no lock,
 * no leader election, and no coordination between instances is needed.
 */
async function claim(key: string): Promise<boolean> {
  const done = await Migration.findOne({ key, status: "done" })
    .select("_id")
    .lean();
  if (done) return false;

  const now = new Date();

  // Retake a failed attempt, or one whose lease has expired.
  const retaken = await Migration.findOneAndUpdate(
    {
      key,
      $or: [
        { status: "failed" },
        { status: "running", startedAt: { $lt: new Date(now.getTime() - STALE_LEASE_MS) } },
      ],
    },
    { $set: { status: "running", startedAt: now }, $inc: { attempts: 1 } },
    { new: true },
  );
  if (retaken) return true;

  try {
    await Migration.create({
      key,
      status: "running",
      startedAt: now,
      attempts: 1,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    });
    return true;
  } catch (error: unknown) {
    // Someone else claimed it microseconds earlier. That is the mechanism
    // working, not a failure.
    if ((error as { code?: number })?.code === 11000) return false;
    throw error;
  }
}

let attemptedThisProcess = false;

/**
 * Run any migration that has not been run yet.
 *
 * Called once per process from `connectToDatabase`, so the first request to
 * touch the database after a deploy is what triggers it — no manual step, no
 * scheduled job to wait for, and no build-time database access that would make
 * a deploy fail because a network path was closed.
 *
 * Never throws. A migration that cannot run must not take the request that
 * happened to trigger it down with it; the lease means the next instance
 * retries.
 */
export async function runPendingMigrations(): Promise<void> {
  if (attemptedThisProcess) return;
  attemptedThisProcess = true;

  // Next evaluates modules while building. Nothing should be migrating then.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  for (const migration of MIGRATIONS) {
    let claimed = false;
    try {
      claimed = await claim(migration.key);
      if (!claimed) continue;

      apiLogger.info(scope, "running", { key: migration.key });
      const result = await migration.run();

      await Migration.updateOne(
        { key: migration.key },
        { $set: { status: "done", finishedAt: new Date(), result } },
      );
      apiLogger.info(scope, "done", { key: migration.key, result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      apiLogger.error(scope, "failed", { key: migration.key, message });
      if (claimed) {
        await Migration.updateOne(
          { key: migration.key },
          { $set: { status: "failed", finishedAt: new Date(), error: message } },
        ).catch(() => {
          /* the lease will expire and another instance will retry */
        });
      }
    }
  }
}
