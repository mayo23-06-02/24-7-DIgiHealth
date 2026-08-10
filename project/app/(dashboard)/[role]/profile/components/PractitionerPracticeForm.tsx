"use client";

import React from "react";
import { Landmark, Award, ClipboardList, Languages, Star } from "lucide-react";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import ProfileSection from "./ProfileSection";

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

interface PractitionerPracticeFormProps {
  practitionerData: PractitionerRoleData;
  setPractitionerData: React.Dispatch<
    React.SetStateAction<PractitionerRoleData | null>
  >;
}

export default function PractitionerPracticeForm({
  practitionerData,
  setPractitionerData,
}: PractitionerPracticeFormProps) {
  const update = (patch: Partial<PractitionerRoleData>) =>
    setPractitionerData((prev) => (prev ? { ...prev, ...patch } : null));

  const updateBank = (patch: Partial<PractitionerRoleData["bankAccount"]>) =>
    setPractitionerData((prev) =>
      prev
        ? { ...prev, bankAccount: { ...prev.bankAccount, ...patch } }
        : null,
    );

  return (
    <>
      <ProfileSection
        icon={<Award size={22} />}
        title="Professional credentials"
        description="How patients and the platform identify your practice"
        color="primary"
      >
        <div
          className={`mb-6 rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            practitionerData.hpcsaVerified
              ? "bg-success-50 border-success-500/20"
              : "bg-primary/5 border-primary/15"
          }`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 text-primary flex items-center justify-center shrink-0">
              <ClipboardList size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                HPCSA registration
              </p>
              <p className="text-lg font-bold text-ink-900 font-mono tracking-wide truncate">
                {practitionerData.hpcsaNumber || "—"}
              </p>
            </div>
          </div>
          {practitionerData.hpcsaVerified ? (
            <Badge label="Verified" status="success" className="shrink-0" />
          ) : (
            <Badge label="Verification pending" status="warning" className="shrink-0" />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <Input
            label="Specialisation"
            value={practitionerData.specialisation || ""}
            onChange={(e) => update({ specialisation: e.target.value })}
          />
          <Input
            label="Years of experience"
            type="number"
            value={String(practitionerData.experienceYears ?? "")}
            onChange={(e) =>
              update({ experienceYears: Number(e.target.value) || 0 })
            }
          />
          <div className="md:col-span-2">
            <Input
              label="Professional bio"
              isTextArea
              rows={4}
              value={practitionerData.bio || ""}
              onChange={(e) => update({ bio: e.target.value })}
              placeholder="Share your clinical focus, approach, and languages for patients…"
            />
          </div>
          <Input
            label="Languages (comma-separated)"
            value={(practitionerData.languages || []).join(", ")}
            onChange={(e) =>
              update({
                languages: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="English, Afrikaans, isiZulu"
            icon={<Languages size={16} />}
          />
          <Input
            label="Accepted medical aids"
            value={(practitionerData.acceptedMedicalAids || []).join(", ")}
            onChange={(e) =>
              update({
                acceptedMedicalAids: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Discovery, Bonitas, …"
          />
        </div>

        {practitionerData.rating > 0 && (
          <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
            <Star className="text-warning-500" size={18} />
            <span className="font-bold text-ink-900">
              {practitionerData.rating}/5
            </span>
            <span className="text-slate-400">
              · {practitionerData.reviewCount || 0} patient reviews
            </span>
          </div>
        )}
      </ProfileSection>

      <ProfileSection
        icon={<Landmark size={22} />}
        title="Payout banking"
        description="Where teleclinic earnings are disbursed"
        color="emerald"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <Input
            label="Account holder"
            value={practitionerData.bankAccount?.accountHolder || ""}
            onChange={(e) => updateBank({ accountHolder: e.target.value })}
          />
          <Input
            label="Bank"
            value={practitionerData.bankAccount?.bankName || ""}
            onChange={(e) => updateBank({ bankName: e.target.value })}
          />
          <Input
            label="Account number"
            value={practitionerData.bankAccount?.accountNumber || ""}
            onChange={(e) => updateBank({ accountNumber: e.target.value })}
          />
          <Input
            label="Branch code"
            value={practitionerData.bankAccount?.branchCode || ""}
            onChange={(e) => updateBank({ branchCode: e.target.value })}
          />
          <Input
            label="Tax number"
            value={practitionerData.bankAccount?.taxNumber || ""}
            onChange={(e) => updateBank({ taxNumber: e.target.value })}
            className="md:col-span-2"
          />
        </div>
      </ProfileSection>
    </>
  );
}
