import { defineModel, type Document, type ModelClass } from '@/lib/db';

export type FacilityPatientStatus = 'pending' | 'active' | 'suspended' | 'discharged';

/** A hospital-issued file: the link that lets one hospital see and book a patient. */
export interface IFacilityPatient extends Document {
  facilityId: string;
  patientId: string;
  fileNumber: string;
  status: FacilityPatientStatus;
  verifiedAt?: Date;
  issuedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** What one hospital knows about a patient (separate per hospital). */
export interface IFacilityPatientProfile extends Document {
  facilityPatientId: string;
  medicalAid?: { provider?: string; planName?: string; memberNumber?: string };
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
  referringDoctor?: string;
  notes?: string;
  details: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export const FacilityPatient: ModelClass<IFacilityPatient> = defineModel<IFacilityPatient>({
  name: 'FacilityPatient', table: 'facility_patients',
  refs: { facilityId: 'Facility', patientId: 'User', issuedBy: 'User' },
});

export const FacilityPatientProfile: ModelClass<IFacilityPatientProfile> = defineModel<IFacilityPatientProfile>({
  name: 'FacilityPatientProfile', table: 'facility_patient_profiles',
  nest: { medicalAid: 'medical_aid_', emergencyContact: 'emergency_contact_' },
  refs: { facilityPatientId: 'FacilityPatient' },
});

export default FacilityPatient;
