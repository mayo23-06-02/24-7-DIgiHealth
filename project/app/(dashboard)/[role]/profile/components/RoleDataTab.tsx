"use client";

import React from "react";
import { BiLoaderAlt, BiCheckCircle } from "react-icons/bi";
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
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400">
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

      {!patientData && !practitionerData && !hospitalData && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <p className="text-sm font-semibold text-slate-500">
            Loading role configuration…
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
        <p className="text-xs text-slate-500">
          Save updates to keep your{" "}
          {currentRole === "patient"
            ? "clinical"
            : currentRole === "hospital_admin"
              ? "facility"
              : "practice"}{" "}
          profile in sync.
        </p>
        <Button
          onClick={handleSaveRoleData}
          disabled={isSaving}
          className="!rounded-lg !h-11 !px-6 !max-w-none normal-case !tracking-normal shrink-0"
          icon={
            isSaving ? (
              <BiLoaderAlt className="animate-spin" size={18} />
            ) : (
              <BiCheckCircle size={18} />
            )
          }
          iconPosition="left"
        >
          {isSaving ? "Saving…" : "Save configuration"}
        </Button>
      </div>
    </div>
  );
}
