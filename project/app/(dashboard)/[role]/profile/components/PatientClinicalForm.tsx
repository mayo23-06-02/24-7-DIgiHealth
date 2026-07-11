"use client";

import React from "react";
import { BiCreditCard, BiFirstAid, BiUser } from "react-icons/bi";
import Input from "@/components/ui/Input";
import ProfileSection from "./ProfileSection";

interface PatientRoleData {
  medicalAid: { provider: string; planName: string; memberNumber: string };
  emergencyContact: { name: string; phone: string; relationship: string };
  subscriptionTier: string;
  dateOfBirth?: string;
  gender?: string;
}

interface PatientClinicalFormProps {
  patientData: PatientRoleData;
  setPatientData: React.Dispatch<React.SetStateAction<PatientRoleData | null>>;
}

export default function PatientClinicalForm({
  patientData,
  setPatientData,
}: PatientClinicalFormProps) {
  const updateAid = (
    patch: Partial<PatientRoleData["medicalAid"]>,
  ) =>
    setPatientData((prev) =>
      prev
        ? { ...prev, medicalAid: { ...prev.medicalAid, ...patch } }
        : null,
    );

  const updateEmergency = (
    patch: Partial<PatientRoleData["emergencyContact"]>,
  ) =>
    setPatientData((prev) =>
      prev
        ? {
            ...prev,
            emergencyContact: { ...prev.emergencyContact, ...patch },
          }
        : null,
    );

  return (
    <>
      <ProfileSection
        icon={<BiCreditCard size={22} />}
        title="Medical aid"
        description="Coverage used for claims and eligibility checks"
        color="primary"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <Input
            label="Scheme provider"
            value={patientData.medicalAid?.provider || ""}
            onChange={(e) => updateAid({ provider: e.target.value })}
            placeholder="e.g. Discovery"
            className="bg-slate-50/60 border-slate-200 focus:bg-white"
          />
          <Input
            label="Plan name"
            value={patientData.medicalAid?.planName || ""}
            onChange={(e) => updateAid({ planName: e.target.value })}
            placeholder="e.g. Classic Saver"
            className="bg-slate-50/60 border-slate-200 focus:bg-white"
          />
          <Input
            label="Member number"
            value={patientData.medicalAid?.memberNumber || ""}
            onChange={(e) => updateAid({ memberNumber: e.target.value })}
            className="bg-slate-50/60 border-slate-200 focus:bg-white md:col-span-2"
          />
        </div>
        {patientData.subscriptionTier && (
          <p className="mt-4 text-xs text-slate-500">
            DigiHealth plan:{" "}
            <span className="font-bold text-slate-700 capitalize">
              {patientData.subscriptionTier}
            </span>
          </p>
        )}
      </ProfileSection>

      <ProfileSection
        icon={<BiFirstAid size={22} />}
        title="Emergency contact"
        description="Who we should reach in an urgent clinical situation"
        color="rose"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <Input
            label="Full name"
            value={patientData.emergencyContact?.name || ""}
            onChange={(e) => updateEmergency({ name: e.target.value })}
            icon={<BiUser />}
            className="bg-slate-50/60 border-slate-200 focus:bg-white"
          />
          <Input
            label="Relationship"
            value={patientData.emergencyContact?.relationship || ""}
            onChange={(e) =>
              updateEmergency({ relationship: e.target.value })
            }
            placeholder="e.g. Spouse, Parent"
            className="bg-slate-50/60 border-slate-200 focus:bg-white"
          />
          <Input
            label="Phone number"
            value={patientData.emergencyContact?.phone || ""}
            onChange={(e) => updateEmergency({ phone: e.target.value })}
            placeholder="+27 …"
            className="bg-slate-50/60 border-slate-200 focus:bg-white md:col-span-2"
          />
        </div>
      </ProfileSection>
    </>
  );
}
