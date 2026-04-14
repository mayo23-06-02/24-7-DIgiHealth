import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IEmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

export interface IPatient extends Document {
  userId: Types.ObjectId;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  mobileNumber: string;
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  bloodType?: string;
  emergencyContact: IEmergencyContact;
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relationship: { type: String },
  },
  { _id: false },
);

const PatientSchema = new Schema<IPatient>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    mobileNumber: { type: String, required: true },
    medicalHistory: [{ type: String }],
    allergies: [{ type: String }],
    currentMedications: [{ type: String }],
    bloodType: { type: String },
    emergencyContact: { type: EmergencyContactSchema, required: true },
  },
  { timestamps: true },
);

PatientSchema.index({ userId: 1 }, { unique: true });

const Patient: Model<IPatient> = mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);
export default Patient;
