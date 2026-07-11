export type HealthRecordTab =
  | "timeline"
  | "body_map"
  | "vitals"
  | "labs"
  | "medications"
  | "allergies"
  | "immunizations";

export interface TimelineEvent {
  id: string;
  type: "consultation" | "medication" | "lab" | "immunization" | "ai_triage";
  date: string;
  title: string;
  description: string;
  metadata?: {
    doctor?: string;
    department?: string;
    dosage?: string;
    duration?: string;
    status?: string;
    documentUrl?: string | null;
    documentName?: string | null;
  };
}

export interface VitalsDataPoint {
  date: string;
  weight?: number;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
}

export interface LabResult {
  id: string;
  name: string;
  date: string;
  orderedBy: string;
  values: {
    parameter: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: "normal" | "high" | "low";
  }[];
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  prescribedDate: string;
  refillsLeft: number;
  status: "active" | "completed" | "discontinued";
  documentUrl?: string | null;
  documentName?: string | null;
  canDownload?: boolean;
}

export interface Allergy {
  id: string;
  allergen: string;
  severity: "mild" | "moderate" | "severe";
  reaction: string;
  source: "patient" | "clinician";
}

export interface Immunization {
  id: string;
  vaccine: string;
  date: string;
  dose: string;
  batch: string;
  administeredBy: string;
  nextDue?: string;
}

export function formatHealthDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
