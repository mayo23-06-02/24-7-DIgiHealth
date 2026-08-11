/**
 * One-time (re-runnable) backfill: Mongo Conversation/Call/AttachedRecord/
 * Message -> Postgres conversations/calls/attached_records/messages. Also
 * backfills the deferred prescriptions.conversation_id/message_id FKs left
 * null by migrate-clinical.ts (those tables didn't exist yet at that point).
 *
 * Depends on users + consultations already being backfilled.
 * Idempotent via mongo_id upserts. Does NOT touch or delete Mongo data.
 *
 * Run: npx tsx scripts/migrate-chat.ts
 */
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { Conversation } from "../lib/models/Conversation";
import { Call } from "../lib/models/Call";
import { AttachedRecord } from "../lib/models/AttachedRecord";
import { Message } from "../lib/models/Message";
import { Prescription } from "../lib/models/ClinicalData";

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY in .env.local");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not found in .env.local");
  await mongoose.connect(uri);
  const supabase = getSupabase();

  console.log("Connected. Starting chat backfill...\n");

  const { data: userRows } = await supabase.from("users").select("id, mongo_id");
  const uid = new Map((userRows || []).map((r: any) => [r.mongo_id, r.id]));
  const { data: consultationRows } = await supabase.from("consultations").select("id, mongo_id");
  const cid = new Map((consultationRows || []).map((r: any) => [r.mongo_id, r.id]));
  console.log(`Loaded ${uid.size} user + ${cid.size} consultation id mappings.\n`);

  // ── conversations ──────────────────────────────────────────────────────────
  const conversations = await Conversation.find().lean();
  console.log(`Mongo conversations: ${conversations.length}`);
  const convoRows: any[] = [];
  for (const c of conversations as any[]) {
    const patientId = uid.get(c.patientId?.toString());
    const practitionerId = uid.get(c.practitionerId?.toString());
    if (!patientId || !practitionerId) {
      console.warn(`  skip conversation ${c._id}: missing patient/practitioner`);
      continue;
    }
    convoRows.push({
      mongo_id: c._id.toString(),
      consultation_id: c.consultationId ? cid.get(c.consultationId.toString()) || null : null,
      patient_id: patientId,
      practitioner_id: practitionerId,
      status: c.status || "active",
      minutes_allocated: c.minutesAllocated || 0,
      minutes_used: c.minutesUsed || 0,
      minutes_requested: c.minutesRequested || 0,
      minutes_approved: c.minutesApproved || 0,
      started_at: c.startedAt,
      last_activity_at: c.lastActivityAt,
    });
  }
  let conversationIdByMongoId = new Map<string, string>();
  for (const batch of chunk(convoRows, 500)) {
    const { data, error } = await supabase
      .from("conversations")
      .upsert(batch, { onConflict: "mongo_id" })
      .select("id, mongo_id");
    if (error) throw new Error(`conversations upsert failed: ${error.message}`);
    for (const row of data || []) conversationIdByMongoId.set(row.mongo_id, row.id);
  }
  console.log(`Postgres conversations upserted: ${conversationIdByMongoId.size}\n`);

  // ── calls ──────────────────────────────────────────────────────────────────
  const calls = await Call.find().lean();
  const callRows = (calls as any[])
    .map((c) => {
      const conversationId = conversationIdByMongoId.get(c.conversationId?.toString());
      const initiatedBy = uid.get(c.initiatedBy?.toString());
      if (!conversationId || !initiatedBy) return null;
      return {
        mongo_id: c._id.toString(),
        consultation_id: c.consultationId ? cid.get(c.consultationId.toString()) || null : null,
        conversation_id: conversationId,
        initiated_by: initiatedBy,
        started_at: c.startedAt,
        ended_at: c.endedAt || null,
        duration_seconds: c.durationSeconds || 0,
        type: c.type,
        status: c.status || "active",
        livekit_room_name: c.livekitRoomName || null,
        livekit_room_url: c.livekitRoomUrl || null,
      };
    })
    .filter(Boolean);
  for (const batch of chunk(callRows as any[], 500)) {
    const { error } = await supabase.from("calls").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`calls upsert failed: ${error.message}`);
  }
  console.log(`Postgres calls upserted: ${callRows.length}`);

  // ── attached_records ───────────────────────────────────────────────────────
  const records = await AttachedRecord.find().lean();
  const recordRows = (records as any[])
    .map((r) => {
      const patientId = uid.get(r.patientId?.toString());
      if (!patientId) return null;
      return {
        mongo_id: r._id.toString(),
        consultation_id: r.consultationId ? cid.get(r.consultationId.toString()) || null : null,
        conversation_id: r.conversationId
          ? conversationIdByMongoId.get(r.conversationId.toString()) || null
          : null,
        patient_id: patientId,
        practitioner_id: r.practitionerId ? uid.get(r.practitionerId.toString()) || null : null,
        type: r.type,
        title: r.title,
        description: r.description || null,
        file_url: r.fileUrl,
        file_mime: r.fileMime,
        file_size: r.fileSize,
        media_id: r.mediaId || null,
        uploaded_at: r.uploadedAt,
        is_read: !!r.isRead,
      };
    })
    .filter(Boolean);
  let attachedRecordIdByMongoId = new Map<string, string>();
  for (const batch of chunk(recordRows as any[], 500)) {
    const { data, error } = await supabase
      .from("attached_records")
      .upsert(batch, { onConflict: "mongo_id" })
      .select("id, mongo_id");
    if (error) throw new Error(`attached_records upsert failed: ${error.message}`);
    for (const row of data || []) attachedRecordIdByMongoId.set(row.mongo_id, row.id);
  }
  console.log(`Postgres attached_records upserted: ${attachedRecordIdByMongoId.size}`);

  // ── messages ───────────────────────────────────────────────────────────────
  const messages = await Message.find().lean();
  console.log(`\nMongo messages: ${messages.length}`);
  const messageRows: any[] = [];
  let skipped = 0;
  for (const m of messages as any[]) {
    const conversationId = conversationIdByMongoId.get(m.conversationId?.toString());
    const senderId = uid.get(m.senderId?.toString());
    const receiverId = uid.get(m.receiverId?.toString());
    if (!conversationId || !senderId || !receiverId) {
      skipped++;
      continue;
    }
    messageRows.push({
      mongo_id: m._id.toString(),
      conversation_id: conversationId,
      sender_id: senderId,
      receiver_id: receiverId,
      content: m.content || null,
      type: m.type || "text",
      file_url: m.fileUrl || null,
      file_mime: m.fileMime || null,
      media_id: m.mediaId || null,
      record_id: m.recordId ? attachedRecordIdByMongoId.get(m.recordId.toString()) || null : null,
      client_id: m.clientId || null,
      is_read: !!m.isRead,
      read_at: m.readAt || null,
      delivered_at: m.deliveredAt || m.createdAt || new Date().toISOString(),
    });
  }
  if (skipped) console.warn(`  skipped ${skipped} messages: missing conversation/sender/receiver`);
  let messageIdByMongoId = new Map<string, string>();
  for (const batch of chunk(messageRows, 500)) {
    const { data, error } = await supabase
      .from("messages")
      .upsert(batch, { onConflict: "mongo_id" })
      .select("id, mongo_id");
    if (error) throw new Error(`messages upsert failed: ${error.message}`);
    for (const row of data || []) messageIdByMongoId.set(row.mongo_id, row.id);
  }
  console.log(`Postgres messages upserted: ${messageIdByMongoId.size}`);

  // ── backfill deferred prescriptions.conversation_id/message_id ──────────────
  const prescriptions = await Prescription.find({
    $or: [{ conversationId: { $exists: true } }, { messageId: { $exists: true } }],
  }).lean();
  let prescriptionFkUpdates = 0;
  for (const p of prescriptions as any[]) {
    const updates: Record<string, unknown> = {};
    if (p.conversationId) {
      const convId = conversationIdByMongoId.get(p.conversationId.toString());
      if (convId) updates.conversation_id = convId;
    }
    if (p.messageId) {
      const msgId = messageIdByMongoId.get(p.messageId.toString());
      if (msgId) updates.message_id = msgId;
    }
    if (Object.keys(updates).length) {
      const { error } = await supabase
        .from("prescriptions")
        .update(updates)
        .eq("mongo_id", p._id.toString());
      if (!error) prescriptionFkUpdates++;
    }
  }
  console.log(`\nPostgres prescriptions conversation/message FKs backfilled: ${prescriptionFkUpdates}`);

  console.log("\nChat backfill complete.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
