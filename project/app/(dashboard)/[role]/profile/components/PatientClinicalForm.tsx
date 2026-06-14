"use client";

import React from "react";
import { BiCreditCard, BiFirstAid } from "react-icons/bi";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

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

function SectionHead({
  icon,
  title,
  sub,
  color = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    rose: "bg-rose-500/10 text-rose-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    blue: "bg-blue-500/10 text-blue-500",
    gray: "bg-slate-500/10 text-slate-500",
  };
  return (
    <div className="flex items-center gap-5">
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center ${
          colorMap[color] || colorMap.primary
        }`}
      >
        {icon}
      </div>
      <div className="gap-1 flex flex-col">
        <h4 className="text-xl font-bold text-slate-800 tracking-tight font-grotesk">
          {title}
        </h4>
        <p className="text-xs text-slate-600 uppercase opacity-70">{sub}</p>
      </div>
    </div>
  );
}

export default function PatientClinicalForm({
  patientData,
  setPatientData,
}: PatientClinicalFormProps) {
  return (
    <>
      <Card className="p-8 space-y-8 rounded-lg border-slate-100 shadow-slate-900/5">
        <SectionHead
          icon={<BiCreditCard size={24} />}
          title="Clinical Coverage"
          sub="Medical aid and insurance synchronization"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <Input
            label="Scheme Provider"
            value={patientData.medicalAid.provider}
            onChange={(e) =>
              setPatientData((prev) =>
                prev
                  ? {
                      ...prev,
                      medicalAid: {
                        ...prev.medicalAid,
                        provider: e.target.value,
                      },
                    }
                  : null,
              )
            }
            placeholder="e.g. Discovery"
          />
          <Input
            label="Plan Classification"
            value={patientData.medicalAid.planName}
            onChange={(e) =>
              setPatientData((prev) =>
                prev
                  ? {
                      ...prev,
                      medicalAid: {
                        ...prev.medicalAid,
                        planName: e.target.value,
                      },
                    }
                  : null,
              )
            }
            placeholder="e.g. Executive"
          />
          <Input
            label="Member Identification"
            value={patientData.medicalAid.memberNumber}
            onChange={(e) =>
              setPatientData((prev) =>
                prev
                  ? {
                      ...prev,
                      medicalAid: {
                        ...prev.medicalAid,
                        memberNumber: e.target.value,
                      },
                    }
                  : null,
              )
            }
            className="md:col-span-2"
          />
        </div>
      </Card>
      <Card className="p-8 space-y-8 rounded-lg border-slate-100 shadow-slate-900/5">
        <SectionHead
          icon={<BiFirstAid size={24} />}
          title="Emergency Contact"
          sub="Primary contact for critical clinical events"
          color="rose"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label=" Name"
            value={patientData.emergencyContact.name}
            onChange={(e) =>
              setPatientData((prev) =>
                prev
                  ? {
                      ...prev,
                      emergencyContact: {
                        ...prev.emergencyContact,
                        name: e.target.value,
                      },
                    }
                  : null,
              )
            }
          />
          <Input
            label="Phone Number"
            value={patientData.emergencyContact.phone}
            onChange={(e) =>
              setPatientData((prev) =>
                prev
                  ? {
                      ...prev,
                      emergencyContact: {
                        ...prev.emergencyContact,
                        phone: e.target.value,
                      },
                    }
                  : null,
              )
            }
          />
          <Input
            label="Kinship"
            value={patientData.emergencyContact.relationship}
            onChange={(e) =>
              setPatientData((prev) =>
                prev
                  ? {
                      ...prev,
                      emergencyContact: {
                        ...prev.emergencyContact,
                        relationship: e.target.value,
                      },
                    }
                  : null,
              )
            }
          />
        </div>
      </Card>
    </>
  );
}
