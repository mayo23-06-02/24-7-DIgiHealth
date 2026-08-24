/**
 * One-off cleanup: collapse duplicate "active" Call rows.
 *
 * Before the unique partial indexes existed, two clients whose appointment
 * countdowns fired together could each create an active Call for the same
 * conversation. Those rows have to go before MongoDB will accept the index —
 * and they are the rows responsible for phantom incoming calls.
 *
 * Keeps the newest active call per conversation (and per consultation) and
 * ends the rest. Rooms are left alone: names are derived, so the duplicates
 * point at a room that the survivor is still legitimately using.
 *
 *   npx tsx scripts/fix-duplicate-active-calls.ts
 *   npx tsx scripts/fix-duplicate-active-calls.ts --dry-run
 */
import "dotenv/config";
import mongoose from "mongoose";
import { Call } from "../lib/models/Call";

const DRY_RUN = process.argv.includes("--dry-run");

async function collapse(groupField: "conversationId" | "consultationId") {
  const groups = await Call.aggregate<{ _id: unknown; ids: unknown[] }>([
    { $match: { status: "active", [groupField]: { $ne: null } } },
    { $sort: { startedAt: -1 } },
    { $group: { _id: `$${groupField}`, ids: { $push: "$_id" } } },
    { $match: { "ids.1": { $exists: true } } },
  ]);

  let ended = 0;
  for (const group of groups) {
    // ids[0] is the newest because of the $sort above — that one survives.
    const [survivor, ...duplicates] = group.ids;
    console.log(
      `${groupField} ${String(group._id)}: keeping ${String(survivor)}, ending ${duplicates.length} duplicate(s)`,
    );
    if (!DRY_RUN) {
      const res = await Call.updateMany(
        { _id: { $in: duplicates } },
        { $set: { status: "ended", endedAt: new Date(), durationSeconds: 0 } },
      );
      ended += res.modifiedCount;
    } else {
      ended += duplicates.length;
    }
  }
  return { groups: groups.length, ended };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri);
  console.log(DRY_RUN ? "Dry run — nothing will be written.\n" : "Applying changes.\n");

  const byConversation = await collapse("conversationId");
  const byConsultation = await collapse("consultationId");

  console.log(
    `\nconversations with duplicates: ${byConversation.groups} (${byConversation.ended} rows ended)`,
  );
  console.log(
    `consultations with duplicates: ${byConsultation.groups} (${byConsultation.ended} rows ended)`,
  );

  if (!DRY_RUN) {
    // Build the new unique partial indexes now that the collisions are gone,
    // rather than waiting for the first request to trigger autoIndex.
    console.log("\nSyncing indexes…");
    await Call.syncIndexes();
    console.log("Indexes synced.");
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
