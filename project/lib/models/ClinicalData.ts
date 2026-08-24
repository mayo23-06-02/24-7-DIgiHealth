import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ==== Anthropometric ====
export interface IAnthropometric extends Document {
  patientId: Types.ObjectId;
  dateRecorded: Date;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
  vitalSigns?: {
    systolicBP: number;
    diastolicBP: number;
    heartRateBpm: number;
    spO2: number;
    temperatureCelsius: number;
  }
}
const AnthropometricSchema = new Schema<IAnthropometric>({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dateRecorded: { type: Date, default: Date.now },
  heightCm: Number,
  weightKg: Number,
  bmi: Number,
  bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] },
  vitalSigns: {
    systolicBP: Number,
    diastolicBP: Number,
    heartRateBpm: Number,
    spO2: Number,
    temperatureCelsius: Number
  }
});
AnthropometricSchema.index({ patientId: 1, dateRecorded: -1 });

// ==== MedicalContext ====
export interface IMedicalContext extends Document {
  patientId: Types.ObjectId;
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
const MedicalContextSchema = new Schema<IMedicalContext>({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  chronicConditions: [{ type: String }],
  allergies: [{
    allergen: String,
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    reaction: String,
    source: { type: String, enum: ['patient', 'clinician'] }
  }],
  currentMedications: [{ type: String }],
  familyHistory: [{ type: String }],
  bloodType: { type: String },
  activityLevel: { type: String }
});

// ==== Prescription ====
export interface IPrescription extends Document {
  patientId: Types.ObjectId;
  practitionerId: Types.ObjectId;
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
  conversationId?: Types.ObjectId;
  messageId?: Types.ObjectId;
}
const PrescriptionSchema = new Schema<IPrescription>({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  practitionerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  medicationName: { type: String, required: true },
  dosage: String,
  instructions: String,
  status: { type: String, enum: ['active', 'completed', 'discontinued'], default: 'active' },
  prescribedDate: { type: Date, default: Date.now },
  refillsRemaining: { type: Number, default: 0 },
  documentUrl: String,
  documentMime: String,
  documentName: String,
  mediaId: String,
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true });

PrescriptionSchema.index({ patientId: 1, prescribedDate: -1 });

// ==== LabResult ====
export interface ILabResult extends Document {
  patientId: Types.ObjectId;
  orderedById?: Types.ObjectId;
  testName: string;
  dateReported: Date;
  parameters: { name: string; value: string; unit: string; referenceRange: string; status: 'normal' | 'high' | 'low' }[];
}
const LabResultSchema = new Schema<ILabResult>({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  orderedById: { type: Schema.Types.ObjectId, ref: 'User' },
  testName: { type: String, required: true },
  dateReported: { type: Date, default: Date.now },
  parameters: [{
    name: String,
    value: String,
    unit: String,
    referenceRange: String,
    status: { type: String, enum: ['normal', 'high', 'low'] }
  }]
});

// ==== Immunization ====
export interface IImmunization extends Document {
  patientId: Types.ObjectId;
  vaccineName: string;
  dateAdministered: Date;
  dosage: string;
  batchNumber?: string;
  administeredBy?: string;
  nextDueDate?: Date;
}
const ImmunizationSchema = new Schema<IImmunization>({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vaccineName: { type: String, required: true },
  dateAdministered: { type: Date, default: Date.now },
  dosage: String,
  batchNumber: String,
  administeredBy: String,
  nextDueDate: Date
});

export const Anthropometric = mongoose.models.Anthropometric || mongoose.model<IAnthropometric>('Anthropometric', AnthropometricSchema);
export const MedicalContext = mongoose.models.MedicalContext || mongoose.model<IMedicalContext>('MedicalContext', MedicalContextSchema);
export const Prescription = mongoose.models.Prescription || mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
export const LabResult = mongoose.models.LabResult || mongoose.model<ILabResult>('LabResult', LabResultSchema);
export const Immunization = mongoose.models.Immunization || mongoose.model<IImmunization>('Immunization', ImmunizationSchema);
