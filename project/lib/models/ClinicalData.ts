import { defineModel, type Document, type ModelClass } from '@/lib/db';
// ==== Anthropometric ====
export interface IAnthropometric extends Document {
  patientId: string;
  dateRecorded: Date;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
  vitalSigns?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRateBpm?: number;
    spO2?: number;
    temperatureCelsius?: number;
    [extra: string]: number | undefined;
  };
}

// ==== MedicalContext ====
export interface IMedicalContext extends Document {
  patientId: string;
  chronicConditions: string[];
  allergies: { allergen: string; severity: 'mild' | 'moderate' | 'severe'; reaction: string; source: 'patient' | 'clinician' }[];
  currentMedications: string[];
  familyHistory: string[];
  /**
   * Standing clinical facts captured at registration.
   *
   * Blood type previously lived only on Anthropometric, which is a
   * point-in-time measurement record written only when height or weight was
   * supplied — so a patient who gave their blood type but skipped both
   * measurements lost it. It belongs here, alongside the other facts that
   * describe the patient rather than a single reading.
   *
   * Activity level was collected at registration and never stored anywhere
   * at all.
   */
  bloodType?: string;
  activityLevel?: string;
}

// ==== Prescription ====
export interface IPrescription extends Document {
  patientId: string;
  practitionerId: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  status: 'active' | 'completed' | 'discontinued';
  prescribedDate: Date;
  refillsRemaining: number;
  /** Formal script PDF / image (letterhead) for pharmacy */
  documentUrl?: string;
  documentMime?: string;
  documentName?: string;
  mediaId?: string;
  conversationId?: string;
  messageId?: string;
}

// ==== LabResult ====
export interface ILabResult extends Document {
  patientId: string;
  orderedById?: string;
  testName: string;
  dateReported: Date;
  parameters: { name: string; value: string; unit: string; referenceRange: string; status: 'normal' | 'high' | 'low' }[];
}

// ==== Immunization ====
export interface IImmunization extends Document {
  patientId: string;
  vaccineName: string;
  dateAdministered: Date;
  dosage: string;
  batchNumber?: string;
  administeredBy?: string;
  nextDueDate?: Date;
}

export const Anthropometric: ModelClass<IAnthropometric> = defineModel<IAnthropometric>({
  name: 'Anthropometric', table: 'anthropometrics',
  columns: {
    'vitalSigns.systolicBP': 'systolic_bp',
    'vitalSigns.diastolicBP': 'diastolic_bp',
    'vitalSigns.heartRateBpm': 'heart_rate_bpm',
    'vitalSigns.spO2': 'spo2',
    'vitalSigns.temperatureCelsius': 'temperature_celsius',
  },
  refs: { patientId: 'User' },
});
export const MedicalContext: ModelClass<IMedicalContext> = defineModel<IMedicalContext>({
  name: 'MedicalContext', table: 'medical_context',
  refs: { patientId: 'User' },
  children: { allergies: { table: 'patient_allergies', fk: 'medical_context_id' } },
});
export const Prescription: ModelClass<IPrescription> = defineModel<IPrescription>({
  name: 'Prescription', table: 'prescriptions',
  refs: { patientId: 'User', practitionerId: 'User', conversationId: 'Conversation', messageId: 'Message' },
});
export const LabResult: ModelClass<ILabResult> = defineModel<ILabResult>({
  name: 'LabResult', table: 'lab_results',
  columns: { orderedById: 'ordered_by' },
  refs: { patientId: 'User', orderedById: 'User' },
  children: { parameters: { table: 'lab_result_parameters', fk: 'lab_result_id' } },
});
export const Immunization: ModelClass<IImmunization> = defineModel<IImmunization>({
  name: 'Immunization', table: 'immunizations',
  refs: { patientId: 'User' },
});
