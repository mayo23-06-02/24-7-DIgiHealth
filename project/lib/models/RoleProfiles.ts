import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ==== Patient Profile ====
export interface IPatientProfile extends Document {
  userId: Types.ObjectId;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  emergencyContact: { name: string; phone: string; relationship: string };
  medicalAid?: { provider: string; planName: string; memberNumber: string };
  subscriptionTier: 'free' | 'pro';
  popiaConsentDate?: Date;
  favoritePractitionerIds?: Types.ObjectId[];
}

const PatientProfileSchema = new Schema<IPatientProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  medicalAid: {
    provider: String,
    planName: String,
    memberNumber: String
  },
  subscriptionTier: { type: String, enum: ['free', 'pro'], default: 'free' },
  popiaConsentDate: { type: Date },
  favoritePractitionerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

// ==== Practitioner Profile ====
export interface IPractitionerProfile extends Document {
  userId: Types.ObjectId;
  specialisation: string;
  hpcsaNumber: string;
  experienceYears: number;
  consultationFee: number;
  bio: string;
  languages: string[];
  acceptedMedicalAids: string[];
  affiliatedFacilityIds: Types.ObjectId[];
  isOnline: boolean;
  bankAccount: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    branchCode: string;
    taxNumber: string;
  }
}

const PractitionerProfileSchema = new Schema<IPractitionerProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  specialisation: { type: String, required: true },
  hpcsaNumber: { type: String, required: true, unique: true },
  experienceYears: { type: Number },
  consultationFee: { type: Number },
  bio: { type: String },
  languages: [{ type: String }],
  acceptedMedicalAids: [{ type: String }],
  affiliatedFacilityIds: [{ type: Schema.Types.ObjectId, ref: 'Facility' }],
  isOnline: { type: Boolean, default: false },
  bankAccount: {
    accountHolder: String,
    bankName: String,
    accountNumber: String,
    branchCode: String,
    taxNumber: String
  }
});

// ==== EMT Profile ====
export interface IEMTProfile extends Document {
  userId: Types.ObjectId;
  licenseLevel: 'BLS' | 'ILS' | 'ALS';
  hpcsaNumber: string;
  assignedVehicle: string;
  assignedFacilityId?: Types.ObjectId;
  shiftSchedule?: { start: string, end: string, days: number[] };
  currentStatus: 'available' | 'dispatched' | 'en_route' | 'at_scene' | 'transporting' | 'at_facility' | 'completed' | 'offline';
  offlineMapsRegion?: string;
  equipmentChecklist?: { item: string, status: boolean, updatedAt?: Date }[];
}

const EMTProfileSchema = new Schema<IEMTProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  licenseLevel: { type: String, enum: ['BLS', 'ILS', 'ALS'], required: true },
  hpcsaNumber: { type: String, required: true },
  assignedVehicle: { type: String },
  assignedFacilityId: { type: Schema.Types.ObjectId, ref: 'Facility' },
  shiftSchedule: { 
    start: String, 
    end: String, 
    days: [Number] 
  },
  currentStatus: { 
    type: String, 
    enum: ['available', 'dispatched', 'en_route', 'at_scene', 'transporting', 'at_facility', 'completed', 'offline'],
    default: 'offline'
  },
  offlineMapsRegion: String,
  equipmentChecklist: [{ 
    item: String, 
    status: Boolean, 
    updatedAt: { type: Date, default: Date.now } 
  }]
});

export const PatientProfile: Model<IPatientProfile> = mongoose.models.PatientProfile || mongoose.model<IPatientProfile>('PatientProfile', PatientProfileSchema);
export const PractitionerProfile: Model<IPractitionerProfile> = mongoose.models.PractitionerProfile || mongoose.model<IPractitionerProfile>('PractitionerProfile', PractitionerProfileSchema);
export const EMTProfile: Model<IEMTProfile> = mongoose.models.EMTProfile || mongoose.model<IEMTProfile>('EMTProfile', EMTProfileSchema);
