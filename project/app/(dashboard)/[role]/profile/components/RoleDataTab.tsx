"use client";

import React from "react";
import { BiLoaderAlt } from "react-icons/bi";
import Button from "@/components/ui/Button";

import PatientClinicalForm from "./PatientClinicalForm";
import PractitionerPracticeForm from "./PractitionerPracticeForm";
import HospitalFacilityForm from "./HospitalFacilityForm";

interface PatientRoleData {
  medicalAid: { provider: string; planName: string; memberNumber: string };
  emergencyContact: { name: string; phone: string; relationship: string };
  subscriptionTier: string;
  dateOfBirth?: string;
  gender?: string;
}

interface PractitionerRoleData {
  specialisation: string;
  hpcsaNumber: string;
  experienceYears: number;
  bio: string;
  languages: string[];
  acceptedMedicalAids: string[];
  bankAccount: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    branchCode: string;
    taxNumber: string;
  };
  hpcsaVerified: boolean;
  rating: number;
  reviewCount: number;
}

interface HospitalAdminRoleData {
  department: string;
  permissions: string[];
  facility: {
    name: string;
    facilityType: string;
    contactInfo: { phone: string; email: string };
    address: { city: string; province: string; street?: string };
    bedCapacity: {
      total: number;
      generalAvailable: number;
      icuAvailable: number;
    };
    specialties: string[];
    emergencyServices: boolean;
  };
}

interface RoleDataTabProps {
  currentRole: string;
  patientData: PatientRoleData | null;
  setPatientData: React.Dispatch<React.SetStateAction<PatientRoleData | null>>;
  practitionerData: PractitionerRoleData | null;
  setPractitionerData: React.Dispatch<
    React.SetStateAction<PractitionerRoleData | null>
  >;
  hospitalData: HospitalAdminRoleData | null;
  setHospitalData: React.Dispatch<
    React.SetStateAction<HospitalAdminRoleData | null>
  >;
  isSaving: boolean;
  handleSaveRoleData: () => void;
}

export default function RoleDataTab({
  currentRole,
  patientData,
  setPatientData,
  practitionerData,
  setPractitionerData,
  hospitalData,
  setHospitalData,
  isSaving,
  handleSaveRoleData,
}: RoleDataTabProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
      {currentRole === "patient" && patientData && (
        <PatientClinicalForm
          patientData={patientData}
          setPatientData={setPatientData}
        />
      )}

      {currentRole === "practitioner" && practitionerData && (
        <PractitionerPracticeForm
          practitionerData={practitionerData}
          setPractitionerData={setPractitionerData}
        />
      )}

      {currentRole === "hospital_admin" && hospitalData && (
        <HospitalFacilityForm
          hospitalData={hospitalData}
          setHospitalData={setHospitalData}
        />
      )}

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSaveRoleData}
          disabled={isSaving}
          className="h-14 rounded-2xl px-10 text-sm font-bold bg-primary text-white"
        >
          {isSaving ? (
            <BiLoaderAlt className="animate-spin" size={20} />
          ) : (
            "Update "
          )}
        </Button>
      </div>
    </div>
  );
}
