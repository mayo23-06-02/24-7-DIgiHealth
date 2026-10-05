import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IEmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

export interface IPatient extends Document {
  userId: string;
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

export const Patient: ModelClass<IPatient> = defineModel<IPatient>({
  name: 'Patient', table: 'patient_profiles',
  nest: { emergencyContact: 'emergency_contact_' },
  refs: { userId: 'User' },
});
export default Patient;
