import type { Types } from "mongoose";
import { Call } from "@/lib/models/Call";

/**
 * The index this migration retires: unique on `conversationId` alone, over
 * every active row. Matched by key pattern rather than by name so a hand-built
 * copy under a different name is retired too.
 */
function isRetiredConversationIndex(index: {
  name?: string;
  key?: Record<string, unknown>;
  unique?: boolean;
}) {
  const keys = Object.keys(index.key || {});
  return (
    index.unique === true && keys.length === 1 && keys[0] === "conversationId"
  );
}

export interface ScopeIndexReport {
  droppedIndexes: string[];
  duplicateGroups: number;
  rowsEnded: number;
}

/**
 * Re-key the per-conversation active-call constraint onto (conversation,
 * consultation).
 *
 * The old index allowed one live call per conversation full stop, which meant a
 * scheduled consultation could not open while *any* other call in that thread
 * was still marked active — a previous appointment nobody had ended, or an
 * ad-hoc call in progress. The insert failed on an index the caller was not
 * querying, so re-reading by consultation found nothing and the session died
 * with "active call vanished immediately after a duplicate-key conflict". That
 * was not a race: for the two people involved it was permanent, and no amount
 * of retrying cleared it.
 *
 * Dropping the old index is the whole fix; the replacement is declared on the
 * schema and built by `createIndexes` below. Idempotent — with the old index
 * already gone it drops nothing and reports an empty list.
 */
export async function scopeActiveCallIndexToSession({
  log = () => {},
}: { log?: (line: string) => void } = {}): Promise<ScopeIndexReport> {
  const collection = Call.collection;

  const existing = (await collection.indexes()) as Array<{
    name?: string;
    key?: Record<string, unknown>;
    unique?: boolean;
  }>;

  const droppedIndexes: string[] = [];
  for (const index of existing) {
    if (!index.name || !isRetiredConversationIndex(index)) continue;
    log(`dropping index ${index.name}`);
    try {
      await collection.dropIndex(index.name);
      droppedIndexes.push(index.name);
    } catch (error: unknown) {
      // IndexNotFound (27) — another instance won the race and dropped it
      // first, which is the outcome we wanted anyway.
      if ((error as { code?: number })?.code !== 27) throw error;
    }
  }

  /*
   * Collapse anything that would violate the replacement before building it.
   *
   * The earlier collapse migration enforced a stricter rule, so in practice
   * there is nothing left to find — but rows created between that run and this
   * one have only ever been checked by the index we just dropped, and a half
   * built unique index would leave the constraint off entirely.
   */
  const groups = await Call.aggregate<{ _id: unknown; ids: Types.ObjectId[] }>([
    { $match: { status: "active" } },
    { $sort: { startedAt: -1 } },
    {
      $group: {
        _id: {
          conversationId: "$conversationId",
          consultationId: "$consultationId",
        },
        ids: { $push: "$_id" },
      },
    },
    { $match: { "ids.1": { $exists: true } } },
  ]);

  let rowsEnded = 0;
  for (const group of groups) {
    // ids[0] is the newest because of the $sort above — that one survives.
    const [survivor, ...duplicates] = group.ids;
    log(
      `duplicate session ${JSON.stringify(group._id)}: keeping ${String(survivor)}, ending ${duplicates.length}`,
    );
    const res = await Call.updateMany(
      { _id: { $in: duplicates } },
      { $set: { status: "ended", endedAt: new Date(), durationSeconds: 0 } },
    );
    rowsEnded += res.modifiedCount;
  }

  // createIndexes, not syncIndexes: this runs unattended in production, and
  // syncIndexes would drop any index not declared on the schema.
  await Call.createIndexes();

  return { droppedIndexes, duplicateGroups: groups.length, rowsEnded };
}
