/**
 * One-time (re-runnable) backfill: Mongo Article/HealthTip/Notification/
 * OfflineActionQueue/SystemConfig/BodyAnnotation/PatientEvent -> Postgres.
 * Also folds lib/models/TelehealthCore.ts's AuditLog into the unified
 * public.audit_logs table.
 *
 * HealthTip.date and PatientEvent.date/.time were free-text strings in
 * Mongo (e.g. "Mon Apr 14 2026") — parsed into real timestamptz columns
 * here, falling back to createdAt when unparseable.
 *
 * Idempotent via mongo_id upserts. Does NOT touch or delete Mongo data.
 *
 * Run: npx tsx scripts/migrate-content.ts
 */
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { Article } from "../lib/models/Article";
import { HealthTip } from "../lib/models/HealthTip";
import { Notification } from "../lib/models/Communications";
import { AuditLog as TelehealthAuditLog } from "../lib/models/TelehealthCore";
import { SystemConfig, OfflineActionQueue } from "../lib/models/System";
import { BodyAnnotation } from "../lib/models/BodyAnnotation";
import PatientEvent from "../lib/models/PatientEvent";

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

function parseFreeTextDate(s: string | undefined, fallback: any): string {
  if (s) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return fallback ? new Date(fallback).toISOString() : new Date().toISOString();
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not found in .env.local");
  await mongoose.connect(uri);
  const supabase = getSupabase();

  console.log("Connected. Starting content backfill...\n");

  const { data: userRows } = await supabase.from("users").select("id, mongo_id");
  const uid = new Map((userRows || []).map((r: any) => [r.mongo_id, r.id]));
  console.log(`Loaded ${uid.size} user id mappings.\n`);

  // ── articles ─────────────────────────────────────────────────────────────
  const articles = await Article.find().lean();
  const articleRows = (articles as any[]).map((a) => ({
    mongo_id: a._id.toString(),
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    content: a.content,
    cover_image: a.coverImage,
    author: a.author,
    published_at: a.publishedAt || a.createdAt || new Date().toISOString(),
    read_time_minutes: a.readTimeMinutes || 5,
    tags: a.tags || [],
    likes: a.likes || 0,
    saves: a.saves || 0,
    shares: a.shares || 0,
    is_published: a.isPublished !== false,
  }));
  for (const batch of chunk(articleRows, 500)) {
    const { error } = await supabase.from("articles").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`articles upsert failed: ${error.message}`);
  }
  console.log(`Postgres articles upserted: ${articleRows.length}`);

  // ── health_tips ──────────────────────────────────────────────────────────
  const healthTips = await HealthTip.find().lean();
  const tipRows = (healthTips as any[]).map((t) => ({
    mongo_id: t._id.toString(),
    title: t.title,
    excerpt: t.excerpt,
    content: t.content || null,
    author: t.author,
    published_date: parseFreeTextDate(t.date, t.createdAt),
    read_time: t.readTime || null,
    image: t.image || null,
    tag: t.tag || null,
    category: t.category || "tip",
  }));
  for (const batch of chunk(tipRows, 500)) {
    const { error } = await supabase.from("health_tips").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`health_tips upsert failed: ${error.message}`);
  }
  console.log(`Postgres health_tips upserted: ${tipRows.length}`);

  // ── notifications ────────────────────────────────────────────────────────
  const notifications = await Notification.find().lean();
  const notificationRows = (notifications as any[])
    .map((n) => {
      const userId = uid.get(n.userId?.toString());
      if (!userId) return null;
      return {
        mongo_id: n._id.toString(),
        user_id: userId,
        type: n.type || "info",
        title: n.title || "",
        body: n.body || "",
        data: n.data || {},
        is_read: !!n.isRead,
        delivered_via: n.deliveredVia || [],
      };
    })
    .filter(Boolean);
  for (const batch of chunk(notificationRows as any[], 500)) {
    const { error } = await supabase.from("notifications").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`notifications upsert failed: ${error.message}`);
  }
  console.log(`Postgres notifications upserted: ${notificationRows.length}`);

  // ── offline_action_queue ─────────────────────────────────────────────────
  const queueItems = await OfflineActionQueue.find().lean();
  const queueRows = (queueItems as any[])
    .map((q) => {
      const userId = uid.get(q.userId?.toString());
      if (!userId) return null;
      return {
        mongo_id: q._id.toString(),
        user_id: userId,
        action: q.action,
        payload: q.payload || {},
        retry_count: q.retryCount || 0,
        last_attempt: q.lastAttempt || null,
        synced_at: q.syncedAt || null,
      };
    })
    .filter(Boolean);
  for (const batch of chunk(queueRows as any[], 500)) {
    const { error } = await supabase.from("offline_action_queue").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`offline_action_queue upsert failed: ${error.message}`);
  }
  console.log(`Postgres offline_action_queue upserted: ${queueRows.length}`);

  // ── system_config (Mongo singleton _id: 'singleton' -> first/only row) ───
  const config = await SystemConfig.findById("singleton").lean();
  if (config) {
    const { data: existing } = await supabase.from("system_config").select("id").limit(1).maybeSingle();
    const row = {
      features: (config as any).features || {},
      maintenance_mode: !!(config as any).maintenanceMode,
      popia_version: (config as any).popiaVersion || null,
      consultation_fee_default: (config as any).consultationFeeDefault || 0,
      emergency_numbers: (config as any).emergencyNumbers || [],
      supported_languages: (config as any).supportedLanguages || [],
    };
    if (existing) {
      const { error } = await supabase.from("system_config").update(row).eq("id", existing.id);
      if (error) throw new Error(`system_config update failed: ${error.message}`);
    } else {
      const { error } = await supabase.from("system_config").insert(row);
      if (error) throw new Error(`system_config insert failed: ${error.message}`);
    }
    console.log(`Postgres system_config synced (single row).`);
  } else {
    console.log(`No Mongo system_config singleton found — skipped.`);
  }

  // ── body_annotations ─────────────────────────────────────────────────────
  const annotations = await BodyAnnotation.find().lean();
  const annotationRows = (annotations as any[])
    .map((a) => {
      const patientId = uid.get(a.patientId?.toString());
      if (!patientId) return null;
      return {
        mongo_id: a._id.toString(),
        patient_id: patientId,
        description: a.description,
        part: a.part || "Surface Mapping",
        point_x: a.point?.x ?? 0,
        point_y: a.point?.y ?? 0,
        point_z: a.point?.z ?? 0,
      };
    })
    .filter(Boolean);
  for (const batch of chunk(annotationRows as any[], 500)) {
    const { error } = await supabase.from("body_annotations").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`body_annotations upsert failed: ${error.message}`);
  }
  console.log(`Postgres body_annotations upserted: ${annotationRows.length}`);

  // ── patient_events ───────────────────────────────────────────────────────
  const events = await PatientEvent.find().lean();
  const eventRows = (events as any[])
    .map((e) => {
      const patientId = uid.get(e.patientId?.toString());
      if (!patientId) return null;
      const dateStr = e.time ? `${e.date} ${e.time}` : e.date;
      return {
        mongo_id: e._id.toString(),
        patient_id: patientId,
        title: e.title,
        event_at: parseFreeTextDate(dateStr, e.createdAt),
        type: e.type || "reminder",
        notes: e.notes || null,
        color: e.color || "primary",
      };
    })
    .filter(Boolean);
  for (const batch of chunk(eventRows as any[], 500)) {
    const { error } = await supabase.from("patient_events").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`patient_events upsert failed: ${error.message}`);
  }
  console.log(`Postgres patient_events upserted: ${eventRows.length}`);

  // ── TelehealthCore.AuditLog -> unified audit_logs ────────────────────────
  const legacyAuditLogs = await TelehealthAuditLog.find().lean();
  const auditRows = (legacyAuditLogs as any[]).map((a) => ({
    mongo_id: `telehealth_${a._id.toString()}`,
    actor_id: a.actorId ? uid.get(a.actorId.toString()) || null : null,
    action: a.action,
    target_type: null,
    target_id: a.targetId ? a.targetId.toString() : null,
    metadata: a.metadata || {},
    ip: a.ipAddress || null,
    created_at: a.timestamp || new Date().toISOString(),
  }));
  for (const batch of chunk(auditRows, 500)) {
    const { error } = await supabase.from("audit_logs").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`telehealth audit_logs upsert failed: ${error.message}`);
  }
  console.log(`\nPostgres audit_logs (from TelehealthCore.AuditLog) upserted: ${auditRows.length}`);

  console.log("\nContent backfill complete.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
