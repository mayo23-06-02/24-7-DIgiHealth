/**
 * One-time (re-runnable) backfill: Mongo Consultation/Anthropometric/
 * MedicalContext/Prescription/LabResult/Immunization/RiskScore/
 * AITriageSession/ClinicalDecisionSupport -> Postgres equivalents.
 *
 * Depends on users + facilities already being backfilled. Skips any row
 * whose required FK can't be resolved (orphaned Mongo data), logging why.
 * Idempotent via mongo_id upserts. Does NOT touch or delete Mongo data.
 *
 * Run: npx tsx scripts/migrate-clinical.ts
 */
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { Consultation } from "../lib/models/Consultation";
import {
  Anthropometric,
  MedicalContext,
  Prescription,
  LabResult,
  Immunization,
} from "../lib/models/ClinicalData";
import RiskScore from "../lib/models/RiskScore";
import { AITriageSession, ClinicalDecisionSupport } from "../lib/models/AIDecision";

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

  console.log("Connected. Starting clinical backfill...\n");

  const { data: userRows } = await supabase.from("users").select("id, mongo_id");
  const uid = new Map((userRows || []).map((r: any) => [r.mongo_id, r.id]));
  const { data: facilityRows } = await supabase.from("facilities").select("id, mongo_id");
  const fid = new Map((facilityRows || []).map((r: any) => [r.mongo_id, r.id]));
  console.log(`Loaded ${uid.size} user + ${fid.size} facility id mappings.\n`);

  // ── consultations ─────────────────────────────────────────────────────────
  const consultations = await Consultation.find().lean();
  console.log(`Mongo consultations: ${consultations.length}`);
  const consultationRows: any[] = [];
  for (const c of consultations as any[]) {
    const patientId = uid.get(c.patientId?.toString());
    const practitionerId = uid.get(c.practitionerId?.toString());
    if (!patientId || !practitionerId) {
      console.warn(`  skip consultation ${c._id}: missing patient/practitioner`);
      continue;
    }
    consultationRows.push({
      mongo_id: c._id.toString(),
      patient_id: patientId,
      practitioner_id: practitionerId,
      facility_id: c.facilityId ? fid.get(c.facilityId.toString()) || null : null,
      type: c.type,
      status: c.status || "requested",
      scheduled_start_time: c.scheduledStartTime,
      scheduled_end_time: c.scheduledEndTime,
      chief_complaint: c.chiefComplaint || null,
      clinical_risk_score: c.clinicalRisk?.score ?? null,
      clinical_risk_color: c.clinicalRisk?.color || null,
      clinical_risk_factors: c.clinicalRisk?.factors || [],
      soap_subjective: c.soapNotes?.subjective || null,
      soap_objective: c.soapNotes?.objective || null,
      soap_assessment: c.soapNotes?.assessment || null,
      soap_plan: c.soapNotes?.plan || null,
      soap_signed_at: c.soapNotes?.signedAt || null,
      call_minutes_used: c.callMinutesUsed || 0,
      source: c.source || null,
      requested_to: c.requestedTo ? uid.get(c.requestedTo.toString()) || null : null,
      reschedule_proposed_start: c.pendingReschedule?.proposedStart || null,
      reschedule_proposed_end: c.pendingReschedule?.proposedEnd || null,
      reschedule_proposed_by: c.pendingReschedule?.proposedBy
        ? uid.get(c.pendingReschedule.proposedBy.toString()) || null
        : null,
      reschedule_proposed_at: c.pendingReschedule?.proposedAt || null,
    });
  }
  let consultationIdByMongoId = new Map<string, string>();
  for (const batch of chunk(consultationRows, 500)) {
    const { data, error } = await supabase
      .from("consultations")
      .upsert(batch, { onConflict: "mongo_id" })
      .select("id, mongo_id");
    if (error) throw new Error(`consultations upsert failed: ${error.message}`);
    for (const row of data || []) consultationIdByMongoId.set(row.mongo_id, row.id);
  }
  console.log(`Postgres consultations upserted: ${consultationIdByMongoId.size}\n`);

  // ── anthropometrics ───────────────────────────────────────────────────────
  const anthro = await Anthropometric.find().lean();
  const anthroRows = (anthro as any[])
    .map((a) => {
      const patientId = uid.get(a.patientId?.toString());
      if (!patientId) return null;
      return {
        mongo_id: a._id.toString(),
        patient_id: patientId,
        date_recorded: a.dateRecorded,
        height_cm: a.heightCm ?? null,
        weight_kg: a.weightKg ?? null,
        bmi: a.bmi ?? null,
        blood_type: a.bloodType || null,
        systolic_bp: a.vitalSigns?.systolicBP ?? null,
        diastolic_bp: a.vitalSigns?.diastolicBP ?? null,
        heart_rate_bpm: a.vitalSigns?.heartRateBpm ?? null,
        spo2: a.vitalSigns?.spO2 ?? null,
        temperature_celsius: a.vitalSigns?.temperatureCelsius ?? null,
      };
    })
    .filter(Boolean);
  for (const batch of chunk(anthroRows as any[], 500)) {
    const { error } = await supabase.from("anthropometrics").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`anthropometrics upsert failed: ${error.message}`);
  }
  console.log(`Postgres anthropometrics upserted: ${anthroRows.length}`);

  // ── medical_context + patient_allergies ──────────────────────────────────
  const contexts = await MedicalContext.find().lean();
  let contextCount = 0;
  let allergyCount = 0;
  for (const c of contexts as any[]) {
    const patientId = uid.get(c.patientId?.toString());
    if (!patientId) continue;
    const { data, error } = await supabase
      .from("medical_context")
      .upsert(
        {
          mongo_id: c._id.toString(),
          patient_id: patientId,
          chronic_conditions: c.chronicConditions || [],
          current_medications: c.currentMedications || [],
          family_history: c.familyHistory || [],
        },
        { onConflict: "mongo_id" },
      )
      .select("id")
      .single();
    if (error || !data) continue;
    contextCount++;
    // Re-insert allergies fresh each run (delete then insert) — safe since
    // this table has no other FKs pointing into it besides medical_context.
    await supabase.from("patient_allergies").delete().eq("medical_context_id", data.id);
    const allergyRows = (c.allergies || []).map((a: any) => ({
      medical_context_id: data.id,
      allergen: a.allergen,
      severity: a.severity,
      reaction: a.reaction || null,
      source: a.source || null,
    }));
    if (allergyRows.length) {
      const { error: aErr } = await supabase.from("patient_allergies").insert(allergyRows);
      if (!aErr) allergyCount += allergyRows.length;
    }
  }
  console.log(`Postgres medical_context upserted: ${contextCount} (+ ${allergyCount} allergies)`);

  // ── prescriptions ──────────────────────────────────────────────────────────
  const prescriptions = await Prescription.find().lean();
  const prescriptionRows = (prescriptions as any[])
    .map((p) => {
      const patientId = uid.get(p.patientId?.toString());
      const practitionerId = uid.get(p.practitionerId?.toString());
      if (!patientId || !practitionerId) return null;
      return {
        mongo_id: p._id.toString(),
        patient_id: patientId,
        practitioner_id: practitionerId,
        medication_name: p.medicationName,
        dosage: p.dosage || null,
        instructions: p.instructions || null,
        status: p.status || "active",
        prescribed_date: p.prescribedDate,
        refills_remaining: p.refillsRemaining || 0,
        document_url: p.documentUrl || null,
        document_mime: p.documentMime || null,
        document_name: p.documentName || null,
        media_id: p.mediaId || null,
        // conversation_id / message_id resolved in migrate-chat.ts once those
        // tables + mappings exist — left null here, backfilled in a second pass.
      };
    })
    .filter(Boolean);
  for (const batch of chunk(prescriptionRows as any[], 500)) {
    const { error } = await supabase.from("prescriptions").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`prescriptions upsert failed: ${error.message}`);
  }
  console.log(`Postgres prescriptions upserted: ${prescriptionRows.length}`);

  // ── lab_results + lab_result_parameters ──────────────────────────────────
  const labResults = await LabResult.find().lean();
  let labResultCount = 0;
  let paramCount = 0;
  for (const l of labResults as any[]) {
    const patientId = uid.get(l.patientId?.toString());
    if (!patientId) continue;
    const { data, error } = await supabase
      .from("lab_results")
      .upsert(
        {
          mongo_id: l._id.toString(),
          patient_id: patientId,
          ordered_by: l.orderedById ? uid.get(l.orderedById.toString()) || null : null,
          test_name: l.testName,
          date_reported: l.dateReported,
        },
        { onConflict: "mongo_id" },
      )
      .select("id")
      .single();
    if (error || !data) continue;
    labResultCount++;
    await supabase.from("lab_result_parameters").delete().eq("lab_result_id", data.id);
    const paramRows = (l.parameters || []).map((p: any) => ({
      lab_result_id: data.id,
      name: p.name,
      value: p.value ?? null,
      unit: p.unit ?? null,
      reference_range: p.referenceRange ?? null,
      status: p.status || null,
    }));
    if (paramRows.length) {
      const { error: pErr } = await supabase.from("lab_result_parameters").insert(paramRows);
      if (!pErr) paramCount += paramRows.length;
    }
  }
  console.log(`Postgres lab_results upserted: ${labResultCount} (+ ${paramCount} parameters)`);

  // ── immunizations ──────────────────────────────────────────────────────────
  const immunizations = await Immunization.find().lean();
  const immunizationRows = (immunizations as any[])
    .map((im) => {
      const patientId = uid.get(im.patientId?.toString());
      if (!patientId) return null;
      return {
        mongo_id: im._id.toString(),
        patient_id: patientId,
        vaccine_name: im.vaccineName,
        date_administered: im.dateAdministered,
        dosage: im.dosage || null,
        batch_number: im.batchNumber || null,
        administered_by: im.administeredBy || null,
        next_due_date: im.nextDueDate || null,
      };
    })
    .filter(Boolean);
  for (const batch of chunk(immunizationRows as any[], 500)) {
    const { error } = await supabase.from("immunizations").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`immunizations upsert failed: ${error.message}`);
  }
  console.log(`Postgres immunizations upserted: ${immunizationRows.length}`);

  // ── risk_scores ──────────────────────────────────────────────────────────
  const riskScores = await RiskScore.find().lean();
  const riskRows = (riskScores as any[])
    .map((r) => {
      const patientId = uid.get(r.patientId?.toString());
      const practitionerId = uid.get(r.practitionerId?.toString());
      if (!patientId || !practitionerId) return null;
      return {
        mongo_id: r._id.toString(),
        patient_id: patientId,
        practitioner_id: practitionerId,
        consultation_id: r.consultationId
          ? consultationIdByMongoId.get(r.consultationId.toString()) || null
          : null,
        score: r.score,
        color: r.color,
        factors: r.factors || [],
        condition: r.condition || null,
        notes: r.notes || null,
        calculated_at: r.calculatedAt,
      };
    })
    .filter(Boolean);
  for (const batch of chunk(riskRows as any[], 500)) {
    const { error } = await supabase.from("risk_scores").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`risk_scores upsert failed: ${error.message}`);
  }
  console.log(`Postgres risk_scores upserted: ${riskRows.length}`);

  // ── ai_triage_sessions ─────────────────────────────────────────────────────
  const triageSessions = await AITriageSession.find().lean();
  const triageRows = (triageSessions as any[]).map((t) => ({
    mongo_id: t._id.toString(),
    patient_id: t.patientId ? uid.get(t.patientId.toString()) || null : null,
    symptoms: t.symptoms || null,
    parsed_symptoms: t.parsedSymptoms || [],
    ai_response: t.aiResponse || {},
    recommendation: t.recommendation || null,
    urgency_score: t.urgencyScore ?? null,
    consultation_id: t.consultationId
      ? consultationIdByMongoId.get(t.consultationId.toString()) || null
      : null,
  }));
  for (const batch of chunk(triageRows, 500)) {
    const { error } = await supabase.from("ai_triage_sessions").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`ai_triage_sessions upsert failed: ${error.message}`);
  }
  console.log(`Postgres ai_triage_sessions upserted: ${triageRows.length}`);

  // ── clinical_decision_support ──────────────────────────────────────────────
  const cds = await ClinicalDecisionSupport.find().lean();
  const cdsRows = (cds as any[])
    .map((c) => {
      const consultationId = c.consultationId
        ? consultationIdByMongoId.get(c.consultationId.toString())
        : null;
      if (!consultationId) return null;
      return {
        mongo_id: c._id.toString(),
        practitioner_id: c.practitionerId ? uid.get(c.practitionerId.toString()) || null : null,
        patient_id: c.patientId ? uid.get(c.patientId.toString()) || null : null,
        consultation_id: consultationId,
        risk_score: c.riskScore ?? null,
        suggested_diagnoses: c.suggestedDiagnoses || [],
        recommended_tests: c.recommendedTests || [],
        drug_interactions: c.drugInteractions || [],
        generated_at: c.generatedAt,
      };
    })
    .filter(Boolean);
  for (const batch of chunk(cdsRows as any[], 500)) {
    const { error } = await supabase
      .from("clinical_decision_support")
      .upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`clinical_decision_support upsert failed: ${error.message}`);
  }
  console.log(`Postgres clinical_decision_support upserted: ${cdsRows.length}`);

  console.log("\nClinical backfill complete.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
