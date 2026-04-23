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
  myDoctorIds?: Types.ObjectId[];
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
  favoritePractitionerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  myDoctorIds: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

// ==== Practitioner Profile ====
export interface IPractitionerProfile extends Document {
  userId: Types.ObjectId;
  specialisation: string;
  hpcsaNumber: string;
  experienceYears: number;
  // consultationFee removed - subscription-based model
  bio: string;
  languages: string[];
  acceptedMedicalAids: string[];
  rating: number;
  reviewCount: number;
  achievements: string[];
  reviews: { reviewer: string, rating: number, comment: string, date: Date }[];
  affiliatedFacilityIds: Types.ObjectId[];
  assignedPatientIds?: Types.ObjectId[];
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
  // consultationFee removed - subscription-based model
  bio: { type: String },
  languages: [{ type: String }],
  acceptedMedicalAids: [{ type: String }],
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  achievements: [{ type: String }],
  reviews: [{
     reviewer: String,
     rating: Number,
     comment: String,
     date: { type: Date, default: Date.now }
  }],
  affiliatedFacilityIds: [{ type: Schema.Types.ObjectId, ref: 'Facility' }],
  assignedPatientIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isOnline: { type: Boolean, default: false },
  bankAccount: {
    accountHolder: String,
    bankName: String,
    accountNumber: String,
    branchCode: String,
    taxNumber: String
  }
});

export const PatientProfile: Model<IPatientProfile> = mongoose.models.PatientProfile || mongoose.model<IPatientProfile>('PatientProfile', PatientProfileSchema);
export const PractitionerProfile: Model<IPractitionerProfile> = mongoose.models.PractitionerProfile || mongoose.model<IPractitionerProfile>('PractitionerProfile', PractitionerProfileSchema);
