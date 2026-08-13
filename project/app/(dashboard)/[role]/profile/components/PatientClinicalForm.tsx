"use client";

import React from "react";
import { CreditCard, Siren, User, Users, Plus, Trash2 } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ProfileSection from "./ProfileSection";

interface PatientRoleData {
  medicalAid: { provider: string; planName: string; memberNumber: string };
  emergencyContact: { name: string; phone: string; relationship: string };
  nextOfKin: { name: string; phone: string; relationship: string }[];
  subscriptionTier: string;
  dateOfBirth?: string;
  gender?: string;
}

const MAX_NEXT_OF_KIN = 3;

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

  const nextOfKin = patientData.nextOfKin || [];

  const addNextOfKin = () =>
    setPatientData((prev) =>
      prev && (prev.nextOfKin || []).length < MAX_NEXT_OF_KIN
        ? {
            ...prev,
            nextOfKin: [
              ...(prev.nextOfKin || []),
              { name: "", phone: "", relationship: "" },
            ],
          }
        : prev,
    );

  const updateNextOfKin = (
    index: number,
    patch: Partial<PatientRoleData["nextOfKin"][number]>,
  ) =>
    setPatientData((prev) =>
      prev
        ? {
            ...prev,
            nextOfKin: (prev.nextOfKin || []).map((kin, i) =>
              i === index ? { ...kin, ...patch } : kin,
            ),
          }
        : prev,
    );

  const removeNextOfKin = (index: number) =>
    setPatientData((prev) =>
      prev
        ? {
            ...prev,
            nextOfKin: (prev.nextOfKin || []).filter((_, i) => i !== index),
          }
        : prev,
    );

  return (
    <>
    
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

      <ProfileSection
        icon={<Users size={22} />}
        title="Next of kin"
        description="Up to 3 people we can contact or consult about your care"
        color="blue"
        action={
          nextOfKin.length < MAX_NEXT_OF_KIN ? (
            <Button
              variant="outline"
              size="sm"
              icon={<Plus size={16} />}
              iconPosition="left"
              onClick={addNextOfKin}
            >
              Add
            </Button>
          ) : undefined
        }
      >
        {nextOfKin.length === 0 ? (
          <p className="text-sm text-slate-500">
            No next of kin added yet.
          </p>
        ) : (
          <div className="space-y-5">
            {nextOfKin.map((kin, index) => (
              <div
                key={index}
                className="relative rounded-lg border border-slate-200 p-4 sm:p-5"
              >
                <button
                  type="button"
                  onClick={() => removeNextOfKin(index)}
                  aria-label="Remove next of kin"
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-danger-700 hover:bg-danger-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pr-10">
                  <Input
                    label="Full name"
                    value={kin.name}
                    onChange={(e) =>
                      updateNextOfKin(index, { name: e.target.value })
                    }
                    icon={<User size={16} />}
                  />
                  <Input
                    label="Relationship"
                    value={kin.relationship}
                    onChange={(e) =>
                      updateNextOfKin(index, { relationship: e.target.value })
                    }
                    placeholder="e.g. Sibling, Friend"
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Phone number"
                      value={kin.phone}
                      onChange={(e) =>
                        updateNextOfKin(index, { phone: e.target.value })
                      }
                      placeholder="+27 …"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>
    </>
  );
}
