import {
  Anthropometric,
  MedicalContext,
  LabResult,
} from '@/lib/models/ClinicalData';

export interface PatientClinicalSummary {
  allergies: string[];
  conditions: string[];
  currentMedications: string[];
  recentVitals: {
    date: string;
    weightKg?: number;
    systolicBP?: number;
    diastolicBP?: number;
    heartRateBpm?: number;
  }[];
  recentLabs: {
    name: string;
    date: string;
    values: { parameter: string; value: string; unit: string; status: string }[];
  }[];
  familyHistory: string[];
}

/**
 * Assembles a patient's structured clinical data into a compact summary for
 * injection into an LLM prompt. Deliberately capped (recent records only,
 * not full history) — this output is serialized directly into the prompt,
 * so it must stay small enough to keep token usage/cost predictable.
 * Mirrors the Promise.all query shape already used in
 * app/api/practitioner/patients/[id]/health-record/route.ts, just narrower.
 */
export async function getPatientClinicalSummary(
  patientId: string,
): Promise<PatientClinicalSummary> {
  const [vitals, medContext, labs] = await Promise.all([
    Anthropometric.find({ patientId }).sort({ dateRecorded: -1 }).limit(3).lean(),
    MedicalContext.findOne({ patientId }).lean(),
    LabResult.find({ patientId }).sort({ dateReported: -1 }).limit(5).lean(),
  ]);

  return {
    allergies: (medContext?.allergies || []).map(
      (a: any) => `${a.allergen} (${a.severity}${a.reaction ? ` — ${a.reaction}` : ''})`,
    ),
    conditions: medContext?.chronicConditions || [],
    currentMedications: medContext?.currentMedications || [],
    recentVitals: vitals.map((v: any) => ({
      date: new Date(v.dateRecorded).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }),
      weightKg: v.weightKg,
      systolicBP: v.vitalSigns?.systolicBP,
      diastolicBP: v.vitalSigns?.diastolicBP,
      heartRateBpm: v.vitalSigns?.heartRateBpm,
    })),
    recentLabs: labs.map((l: any) => ({
      name: l.testName,
      date: new Date(l.dateReported).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }),
      values: (l.parameters || []).map((p: any) => ({
        parameter: p.name,
        value: p.value,
        unit: p.unit,
        status: p.status,
      })),
    })),
    familyHistory: medContext?.familyHistory || [],
  };
}

/** Renders the summary as a compact text block for the prompt — allergies
 * are surfaced first, deliberately, since they're the single most
 * safety-critical field a diagnosis-support prompt can carry. */
export function formatClinicalSummaryForPrompt(summary: PatientClinicalSummary): string {
  const lines: string[] = [];

  lines.push(
    summary.allergies.length
      ? `ALLERGIES: ${summary.allergies.join('; ')}`
      : 'ALLERGIES: None on record',
  );
  lines.push(
    summary.currentMedications.length
      ? `Current medications: ${summary.currentMedications.join(', ')}`
      : 'Current medications: None on record',
  );
  lines.push(
    summary.conditions.length
      ? `Chronic conditions: ${summary.conditions.join(', ')}`
      : 'Chronic conditions: None on record',
  );
  if (summary.familyHistory.length) {
    lines.push(`Family history: ${summary.familyHistory.join(', ')}`);
  }
  if (summary.recentVitals.length) {
    lines.push('Recent vitals:');
    for (const v of summary.recentVitals) {
      const parts = [
        v.weightKg ? `weight ${v.weightKg}kg` : null,
        v.systolicBP && v.diastolicBP ? `BP ${v.systolicBP}/${v.diastolicBP}` : null,
        v.heartRateBpm ? `HR ${v.heartRateBpm}bpm` : null,
      ].filter(Boolean);
      lines.push(`  - ${v.date}: ${parts.join(', ') || 'no readings'}`);
    }
  }
  if (summary.recentLabs.length) {
    lines.push('Recent labs:');
    for (const l of summary.recentLabs) {
      const vals = l.values
        .map((v) => `${v.parameter} ${v.value}${v.unit} (${v.status})`)
        .join(', ');
      lines.push(`  - ${l.name} (${l.date}): ${vals || 'no parameters recorded'}`);
    }
  }

  return lines.join('\n');
}
