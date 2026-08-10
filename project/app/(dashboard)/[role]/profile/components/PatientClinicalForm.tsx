"use client";

import React from "react";
import { CreditCard, Siren, User } from "lucide-react";
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
        icon={<CreditCard size={22} />}
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
          />
          <Input
            label="Plan name"
            value={patientData.medicalAid?.planName || ""}
            onChange={(e) => updateAid({ planName: e.target.value })}
            placeholder="e.g. Classic Saver"
          />
          <div className="md:col-span-2">
            <Input
              label="Member number"
              value={patientData.medicalAid?.memberNumber || ""}
              onChange={(e) => updateAid({ memberNumber: e.target.value })}
            />
          </div>
        </div>
        {patientData.subscriptionTier && (
          <p className="mt-4 text-xs text-slate-500">
            DigiHealth plan:{" "}
            <span className="font-bold text-ink-900 capitalize">
              {patientData.subscriptionTier}
            </span>
          </p>
        )}
      </ProfileSection>

      <ProfileSection
        icon={<Siren size={22} />}
        title="Emergency contact"
        description="Who we should reach in an urgent clinical situation"
        color="rose"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <Input
            label="Full name"
            value={patientData.emergencyContact?.name || ""}
            onChange={(e) => updateEmergency({ name: e.target.value })}
            icon={<User size={16} />}
          />
          <Input
            label="Relationship"
            value={patientData.emergencyContact?.relationship || ""}
            onChange={(e) =>
              updateEmergency({ relationship: e.target.value })
            }
            placeholder="e.g. Spouse, Parent"
          />
          <div className="md:col-span-2">
            <Input
              label="Phone number"
              value={patientData.emergencyContact?.phone || ""}
              onChange={(e) => updateEmergency({ phone: e.target.value })}
              placeholder="+27 …"
            />
          </div>
        </div>
      </ProfileSection>
    </>
  );
}
