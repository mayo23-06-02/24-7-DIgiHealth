/**
 * One-time (re-runnable) backfill: Mongo Billing.ts models -> Postgres
 * billing tables. BillingAuditLog folds into the unified public.audit_logs
 * table (not a separate table) per the migration plan. Also backfills the
 * ad-hoc inline "Billing" model (app/api/practitioner/billing/route.ts,
 * collection name "billings") into payment_transactions.
 *
 * Depends on users, facilities, consultations already being backfilled.
 * Idempotent via mongo_id upserts. Does NOT touch or delete Mongo data.
 *
 * Run: npx tsx scripts/migrate-billing.ts
 */
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import {
  PaymentTransaction,
  Subscription,
  PayoutRequest,
  PaymentMethod,
  PlatformFeeConfig,
  HospitalRevenue,
  BillingAuditLog,
} from "../lib/models/Billing";

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

  console.log("Connected. Starting billing backfill...\n");

  const { data: userRows } = await supabase.from("users").select("id, mongo_id");
  const uid = new Map((userRows || []).map((r: any) => [r.mongo_id, r.id]));
  const { data: facilityRows } = await supabase.from("facilities").select("id, mongo_id");
  const fid = new Map((facilityRows || []).map((r: any) => [r.mongo_id, r.id]));
  const { data: consultationRows } = await supabase.from("consultations").select("id, mongo_id");
  const cid = new Map((consultationRows || []).map((r: any) => [r.mongo_id, r.id]));
  console.log(`Loaded ${uid.size} user + ${fid.size} facility + ${cid.size} consultation id mappings.\n`);

  // ── payment_transactions (PaymentTransaction + ad-hoc practitioner Billing) ─
  const transactions = await PaymentTransaction.find().lean();
  console.log(`Mongo payment transactions: ${transactions.length}`);
  const txnRows = (transactions as any[])
    .map((t) => ({
      mongo_id: t._id.toString(),
      patient_id: t.patientId ? uid.get(t.patientId.toString()) || null : null,
      practitioner_id: t.practitionerId ? uid.get(t.practitionerId.toString()) || null : null,
      facility_id: t.facilityId ? fid.get(t.facilityId.toString()) || null : null,
      consultation_id: t.consultationId ? cid.get(t.consultationId.toString()) || null : null,
      amount: t.amount || 0,
      currency: t.currency || "ZAR",
      provider: t.provider || null,
      status: t.status || "pending",
      description: t.description || null,
      category: t.category || null,
      provider_transaction_id: t.providerTransactionId || null,
      receipt_url: t.receiptUrl || null,
      medical_aid_claim_ref: t.medicalAidClaimRef || null,
      platform_fee_amount: t.platformFeeAmount ?? null,
      practitioner_earnings: t.practitionerEarnings ?? null,
      occurred_at: t.timestamp || t.createdAt || new Date().toISOString(),
    }))
    .filter((r) => r.patient_id || r.practitioner_id); // need at least one party to be meaningful
  for (const batch of chunk(txnRows, 500)) {
    const { error } = await supabase.from("payment_transactions").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`payment_transactions upsert failed: ${error.message}`);
  }
  console.log(`Postgres payment_transactions upserted: ${txnRows.length}`);

  // Ad-hoc inline "Billing" model from app/api/practitioner/billing/route.ts
  // (collection "billings") — reconcile into payment_transactions too.
  try {
    const raw = mongoose.connection.collection("billings");
    const adhoc = await raw.find({}).toArray();
    console.log(`Mongo ad-hoc "billings" collection: ${adhoc.length}`);
    const adhocRows = adhoc
      .map((b: any) => {
        const patientId = b.patientId ? uid.get(b.patientId.toString()) : null;
        const practitionerId = b.practitionerId ? uid.get(b.practitionerId.toString()) : null;
        if (!patientId && !practitionerId) return null;
        return {
          mongo_id: `adhoc_${b._id.toString()}`,
          patient_id: patientId || null,
          practitioner_id: practitionerId || null,
          consultation_id: b.consultationId ? cid.get(b.consultationId.toString()) || null : null,
          amount: b.amount || 0,
          currency: "ZAR",
          status: b.status || "pending",
          description: b.invoiceNumber ? `Invoice ${b.invoiceNumber}` : b.type || null,
          category: null,
          occurred_at: b.date || b.createdAt || new Date().toISOString(),
        };
      })
      .filter(Boolean);
    for (const batch of chunk(adhocRows as any[], 500)) {
      const { error } = await supabase
        .from("payment_transactions")
        .upsert(batch, { onConflict: "mongo_id" });
      if (error) throw new Error(`ad-hoc billing upsert failed: ${error.message}`);
    }
    console.log(`Postgres payment_transactions (ad-hoc) upserted: ${adhocRows.length}`);
  } catch (e) {
    console.warn("  ad-hoc billings collection skipped:", e);
  }

  // ── subscriptions ────────────────────────────────────────────────────────
  // Some legacy rows hold tier values outside the current Mongoose enum
  // (data drift from an older seed path that bypassed schema validation) —
  // normalize rather than crash the backfill on them.
  const VALID_TIERS = new Set(["free", "pro", "family"]);
  function normalizeTier(t: string | undefined): "free" | "pro" | "family" {
    if (t && VALID_TIERS.has(t)) return t as any;
    if (t) console.warn(`  normalizing unknown subscription tier "${t}" -> "pro"`);
    return t ? "pro" : "free";
  }

  const subscriptions = await Subscription.find().lean();
  const subRows = (subscriptions as any[])
    .map((s) => {
      const patientId = uid.get(s.patientId?.toString());
      if (!patientId) return null;
      return {
        mongo_id: s._id.toString(),
        patient_id: patientId,
        tier: normalizeTier(s.tier),
        status: s.status || null,
        start_date: s.startDate || null,
        next_billing_date: s.nextBillingDate || null,
        payment_method_id: s.paymentMethodId || null,
        auto_renew: s.autoRenew !== false,
        price: s.price || 0,
      };
    })
    .filter(Boolean);
  for (const batch of chunk(subRows as any[], 500)) {
    const { error } = await supabase.from("subscriptions").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`subscriptions upsert failed: ${error.message}`);
  }
  console.log(`\nPostgres subscriptions upserted: ${subRows.length}`);

  // ── payout_requests ──────────────────────────────────────────────────────
  const payouts = await PayoutRequest.find().lean();
  const payoutRows = (payouts as any[])
    .map((p) => {
      const practitionerId = uid.get(p.practitionerId?.toString());
      if (!practitionerId) return null;
      return {
        mongo_id: p._id.toString(),
        practitioner_id: practitionerId,
        facility_id: p.facilityId ? fid.get(p.facilityId.toString()) || null : null,
        amount: p.amount || 0,
        currency: p.currency || "ZAR",
        status: p.status || "pending",
        requested_at: p.requestedAt,
        processed_at: p.processedAt || null,
        bank_account_holder: p.bankAccount?.accountHolder || null,
        bank_name: p.bankAccount?.bankName || null,
        bank_account_number: p.bankAccount?.accountNumber || null,
        bank_branch_code: p.bankAccount?.branchCode || null,
        period_from: p.periodFrom || null,
        period_to: p.periodTo || null,
        consultation_count: p.consultationCount || 0,
        platform_fee_deducted: p.platformFeeDeducted || 0,
        notes: p.notes || null,
        approved_by: p.approvedBy ? uid.get(p.approvedBy.toString()) || null : null,
      };
    })
    .filter(Boolean);
  for (const batch of chunk(payoutRows as any[], 500)) {
    const { error } = await supabase.from("payout_requests").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`payout_requests upsert failed: ${error.message}`);
  }
  console.log(`Postgres payout_requests upserted: ${payoutRows.length}`);

  // ── payment_methods ──────────────────────────────────────────────────────
  const methods = await PaymentMethod.find().lean();
  const methodRows = (methods as any[])
    .map((m) => {
      const patientId = uid.get(m.patientId?.toString());
      if (!patientId) return null;
      return {
        mongo_id: m._id.toString(),
        patient_id: patientId,
        type: m.type,
        is_default: !!m.isDefault,
        card_brand: m.cardBrand || null,
        card_last4: m.last4 || null,
        card_expiry_month: m.expiryMonth ?? null,
        card_expiry_year: m.expiryYear ?? null,
        medical_aid_provider: m.medicalAidProvider || null,
        medical_aid_number: m.medicalAidNumber || null,
        bank_name: m.bankName || null,
        bank_account_number: m.accountNumber || null,
        bank_branch_code: m.branchCode || null,
        insurance_provider: m.insuranceProvider || null,
        insurance_policy_number: m.policyNumber || null,
        insurance_coverage_type: m.coverageType || null,
      };
    })
    .filter(Boolean);
  for (const batch of chunk(methodRows as any[], 500)) {
    const { error } = await supabase.from("payment_methods").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`payment_methods upsert failed: ${error.message}`);
  }
  console.log(`Postgres payment_methods upserted: ${methodRows.length}`);

  // ── platform_fee_config ──────────────────────────────────────────────────
  const feeConfigs = await PlatformFeeConfig.find().lean();
  const feeRows = (feeConfigs as any[]).map((f) => ({
    mongo_id: f._id.toString(),
    platform_fee_percent: f.platformFeePercent ?? 15,
    subscription_fee_percent: f.subscriptionFeePercent ?? 10,
    updated_by: f.updatedBy ? uid.get(f.updatedBy.toString()) || null : null,
    notes: f.notes || null,
  }));
  for (const batch of chunk(feeRows, 500)) {
    const { error } = await supabase.from("platform_fee_config").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`platform_fee_config upsert failed: ${error.message}`);
  }
  console.log(`Postgres platform_fee_config upserted: ${feeRows.length}`);

  // ── hospital_revenue + hospital_revenue_by_department ────────────────────
  const revenues = await HospitalRevenue.find().lean();
  let revenueCount = 0;
  let deptCount = 0;
  for (const r of revenues as any[]) {
    const facilityId = fid.get(r.facilityId?.toString());
    if (!facilityId) continue;
    const { data, error } = await supabase
      .from("hospital_revenue")
      .upsert(
        {
          mongo_id: r._id.toString(),
          facility_id: facilityId,
          period: r.period,
          revenue_date: r.date,
          total_revenue: r.totalRevenue || 0,
          pending_payouts: r.pendingPayouts || 0,
          completed_payouts: r.completedPayouts || 0,
          net_revenue: r.netRevenue || 0,
        },
        { onConflict: "mongo_id" },
      )
      .select("id")
      .single();
    if (error || !data) continue;
    revenueCount++;
    await supabase.from("hospital_revenue_by_department").delete().eq("hospital_revenue_id", data.id);
    const deptRows = (r.byDepartment || []).map((d: any) => ({
      hospital_revenue_id: data.id,
      department: d.department,
      revenue: d.revenue || 0,
      transaction_count: d.transactionCount || 0,
    }));
    if (deptRows.length) {
      const { error: dErr } = await supabase.from("hospital_revenue_by_department").insert(deptRows);
      if (!dErr) deptCount += deptRows.length;
    }
  }
  console.log(`Postgres hospital_revenue upserted: ${revenueCount} (+ ${deptCount} department rows)`);

  // ── BillingAuditLog -> unified audit_logs ────────────────────────────────
  const billingAuditLogs = await BillingAuditLog.find().lean();
  const auditRows = (billingAuditLogs as any[]).map((a) => ({
    mongo_id: `billing_${a._id.toString()}`,
    actor_id: a.actorId ? uid.get(a.actorId.toString()) || null : null,
    action: a.actionType || "billing.action",
    target_type: a.targetModel || null,
    target_id: a.targetId ? a.targetId.toString() : null,
    metadata: a.details || {},
    created_at: a.timestamp || a.createdAt || new Date().toISOString(),
  }));
  for (const batch of chunk(auditRows, 500)) {
    const { error } = await supabase.from("audit_logs").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`billing audit_logs upsert failed: ${error.message}`);
  }
  console.log(`\nPostgres audit_logs (from BillingAuditLog) upserted: ${auditRows.length}`);

  console.log("\nBilling backfill complete.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
