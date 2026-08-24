import type { Types } from "mongoose";
import { Call } from "@/lib/models/Call";

export interface CollapseReport {
  conversationGroups: number;
  consultationGroups: number;
  rowsEnded: number;
  indexesBuilt: boolean;
}

async function collapse(
  groupField: "conversationId" | "consultationId",
  dryRun: boolean,
  log: (line: string) => void,
) {
  const groups = await Call.aggregate<{ _id: unknown; ids: Types.ObjectId[] }>([
    { $match: { status: "active", [groupField]: { $ne: null } } },
    { $sort: { startedAt: -1 } },
    { $group: { _id: `$${groupField}`, ids: { $push: "$_id" } } },
    { $match: { "ids.1": { $exists: true } } },
  ]);

  let ended = 0;
  for (const group of groups) {
    // ids[0] is the newest because of the $sort above — that one survives.
    const [survivor, ...duplicates] = group.ids;
    log(
      `${groupField} ${String(group._id)}: keeping ${String(survivor)}, ending ${duplicates.length} duplicate(s)`,
    );
    if (dryRun) {
      ended += duplicates.length;
      continue;
    }
    const res = await Call.updateMany(
      { _id: { $in: duplicates } },
      { $set: { status: "ended", endedAt: new Date(), durationSeconds: 0 } },
    );
    ended += res.modifiedCount;
  }

  return { groups: groups.length, ended };
}

/**
 * Collapse duplicate "active" Call rows, then build the indexes that stop them
 * coming back.
 *
 * Before the unique partial indexes existed, two clients whose appointment
 * countdowns fired together could each create an active Call for the same
 * conversation. Those rows are what produced phantom incoming calls, and they
 * also block the index from building — so the cleanup has to come first and the
 * index second, in that order, in one pass.
 *
 * Idempotent: with nothing to collapse it finds no groups, rebuilds nothing it
 * does not need, and reports zeroes.
 *
 * LiveKit rooms are deliberately untouched. Room names are derived, so a
 * duplicate row names the room its survivor is still legitimately using.
 */
export async function collapseDuplicateActiveCalls({
  dryRun = false,
  log = () => {},
}: { dryRun?: boolean; log?: (line: string) => void } = {}): Promise<CollapseReport> {
  const byConversation = await collapse("conversationId", dryRun, log);
  const byConsultation = await collapse("consultationId", dryRun, log);

  let indexesBuilt = false;
  if (!dryRun) {
    // createIndexes, not syncIndexes: this runs unattended in production, and
    // syncIndexes would drop any index not declared on the schema. Building
    // what is missing is the whole job here.
    await Call.createIndexes();
    indexesBuilt = true;
  }

  return {
    conversationGroups: byConversation.groups,
    consultationGroups: byConsultation.groups,
    rowsEnded: byConversation.ended + byConsultation.ended,
    indexesBuilt,
  };
}
