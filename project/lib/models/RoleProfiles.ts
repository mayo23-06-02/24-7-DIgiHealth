import { defineModel, type Document, type ModelClass } from '@/lib/db';
// ==== Patient Profile ====
export interface IPatientProfile extends Document {
  userId: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  idNumber?: string;
  ageRange?: '0-2' | '3-5' | '5-12' | '13-18';
  emergencyContact: { name: string; phone: string; relationship: string };
  /** Up to 3 — enforced both in the schema validator and the API route. */
  nextOfKin?: { name: string; phone: string; relationship: string }[];
  medicalAid?: { provider: string; planName: string; memberNumber: string };
  subscriptionTier: 'free' | 'pro';
  popiaConsentDate?: Date;
  termsAcceptedAt?: Date;
  favoritePractitionerIds?: string[];
  myDoctorIds?: string[];
  profilePhoto?: string;
  medicalDocuments?: string[];
}

// ==== Practitioner Profile ====
export interface IPractitionerProfile extends Document {
  userId: string;
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
  affiliatedFacilityIds: string[];
  assignedPatientIds?: string[];
  isOnline: boolean;
  profilePhoto?: string;
  hpcsaCertificate?: string;
  bankAccount: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    branchCode: string;
    taxNumber: string;
  };
  address?: {
    street: string;
    city: string;
    province: string;
  };
  consentAcceptedAt?: Date;
  termsAcceptedAt?: Date;
}

// ==== Hospital Admin Profile ====
export interface IHospitalAdminProfile extends Document {
  userId: string;
  hospitalId: string;
  department?: string;
  permissions?: string[];
}

export const PatientProfile: ModelClass<IPatientProfile> = defineModel<IPatientProfile>({
  name: 'PatientProfile', table: 'patient_profiles',
  nest: { emergencyContact: 'emergency_contact_', medicalAid: 'medical_aid_' },
  refs: { userId: 'User', favoritePractitionerIds: 'User', myDoctorIds: 'User' },
  lists: {
    favoritePractitionerIds: {
      table: 'patient_practitioner_links', ownerCol: 'patient_id', ownerKeyCol: 'user_id',
      valueCol: 'practitioner_id', where: { link_type: 'favorite' },
    },
    myDoctorIds: {
      table: 'patient_practitioner_links', ownerCol: 'patient_id', ownerKeyCol: 'user_id',
      valueCol: 'practitioner_id', where: { link_type: 'my_doctor' },
    },
  },
});
export const PractitionerProfile: ModelClass<IPractitionerProfile> = defineModel<IPractitionerProfile>({
  name: 'PractitionerProfile', table: 'practitioner_profiles',
  columns: {
    reviews: 'embedded_reviews',
    'bankAccount.accountHolder': 'bank_account_holder',
    'bankAccount.bankName': 'bank_name',
    'bankAccount.accountNumber': 'bank_account_number',
    'bankAccount.branchCode': 'bank_branch_code',
    'bankAccount.taxNumber': 'tax_number',
  },
  nest: { address: 'address_' },
  refs: { userId: 'User', affiliatedFacilityIds: 'Facility', assignedPatientIds: 'User' },
  lists: {
    affiliatedFacilityIds: {
      table: 'practitioner_facilities', ownerCol: 'practitioner_id', ownerKeyCol: 'user_id', valueCol: 'facility_id',
    },
    assignedPatientIds: {
      table: 'patient_practitioner_links', ownerCol: 'practitioner_id', ownerKeyCol: 'user_id',
      valueCol: 'patient_id', where: { link_type: 'assigned' },
    },
  },
});
export const HospitalAdminProfile: ModelClass<IHospitalAdminProfile> = defineModel<IHospitalAdminProfile>({
  name: 'HospitalAdminProfile', table: 'hospital_admin_profiles',
  columns: { hospitalId: 'facility_id' },
  refs: { userId: 'User', hospitalId: 'Facility' },
});
