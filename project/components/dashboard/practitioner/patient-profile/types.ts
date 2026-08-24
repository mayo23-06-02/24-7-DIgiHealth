export interface PatientPrescription {
  id: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  status: "active" | "completed" | "discontinued";
  prescribedDate: string;
  refillsRemaining: number;
  documentUrl?: string | null;
  documentName?: string | null;
  canDownload?: boolean;
}

export interface PatientConsultation {
  id: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: string;
  type: string;
  chiefComplaint: string;
  riskScore: number;
  riskColor: "green" | "gray" | "red";
  soapNotes?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
}

export interface PatientDocument {
  id: string;
  type: string;
  url: string;
  mediaId?: string | null;
  mimeType: string;
  status: string;
  createdAt: string;
  note?: string;
  uploadedByPractitioner?: boolean;
}

export interface PatientProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  dateOfBirth: string;
  gender: string;
  mobileNumber: string;
  bloodType: string;
  activityLevel?: string | null;
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  emergencyContact: { name: string; phone: string; relationship: string };
  prescriptions: PatientPrescription[];
  /** Patient-uploaded files from profile → Documents */
  documents?: PatientDocument[];
  age?: number | null;
  dateJoined?: string | null;
  riskScore?: number;
  riskColor?: string;
  riskLabel?: string;
  ageRange?: '0-2' | '3-5' | '5-12' | '13-18';
  pastConsultations: PatientConsultation[];
  vitals?: {
    heartRate?: number | string;
    bloodPressure?: string;
    weight?: number | string;
    height?: number | string;
    dateRecorded?: string | Date;
  };
}

export interface PrescriptionFormState {
  medicationName: string;
  dosage: string;
  instructions: string;
  refillsRemaining: number;
}

export interface VitalsFormState {
  heartRate: string;
  bloodPressure: string;
  bodyMass: string;
  glucose: string;
}

export interface ClinicalUpdateFormState {
  medicalHistory: string;
  allergies: string;
  currentMedications: string;
}
