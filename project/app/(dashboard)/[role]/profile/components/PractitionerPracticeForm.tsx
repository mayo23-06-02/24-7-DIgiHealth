"use client";

import React from "react";
import { BiBuilding, BiCertification, BiClipboard, BiCheckCircle } from "react-icons/bi";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

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
  setPractitionerData: React.Dispatch<React.SetStateAction<PractitionerRoleData | null>>;
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

export default function PractitionerPracticeForm({
  practitionerData,
  setPractitionerData,
}: PractitionerPracticeFormProps) {
  return (
    <>
      <Card className="p-8 space-y-8 rounded-lg border-slate-100 shadow-slate-900/5">
        <SectionHead
          icon={<BiBuilding size={24} />}
          title="Revenue Disbursement"
          sub="Commercial banking and tax integration"
          color="emerald"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <Input
            label="Account Holder"
            value={practitionerData.bankAccount.accountHolder}
            onChange={(e) =>
              setPractitionerData((prev) =>
                prev
                  ? {
                      ...prev,
                      bankAccount: {
                        ...prev.bankAccount,
                        accountHolder: e.target.value,
                      },
                    }
                  : null
              )
            }
          />
          <Input
            label="Banking Institution"
            value={practitionerData.bankAccount.bankName}
            onChange={(e) =>
              setPractitionerData((prev) =>
                prev
                  ? {
                      ...prev,
                      bankAccount: {
                        ...prev.bankAccount,
                        bankName: e.target.value,
                      },
                    }
                  : null
              )
            }
          />
          <Input
            label="Account Reference"
            value={practitionerData.bankAccount.accountNumber}
            onChange={(e) =>
              setPractitionerData((prev) =>
                prev
                  ? {
                      ...prev,
                      bankAccount: {
                        ...prev.bankAccount,
                        accountNumber: e.target.value,
                      },
                    }
                  : null
              )
            }
          />
          <Input
            label="Branch/Tax ID"
            value={practitionerData.bankAccount.branchCode}
            onChange={(e) =>
              setPractitionerData((prev) =>
                prev
                  ? {
                      ...prev,
                      bankAccount: {
                        ...prev.bankAccount,
                        branchCode: e.target.value,
                      },
                    }
                  : null
              )
            }
          />
        </div>
      </Card>
      <Card className="p-8 space-y-8 rounded-lg border-slate-100">
        <SectionHead
          icon={<BiCertification size={24} />}
          title="Clinical Protocol"
          sub="HPCSA validation and professional bio"
        />
        <div className="p-8 bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-primary border border-primary/10">
              <BiClipboard size={32} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 font-grotesk">
                {practitionerData.hpcsaNumber}
              </h1>
              <p className="text-sm text-slate-500">HPCSA Registration</p>
            </div>
          </div>
          {practitionerData.hpcsaVerified ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 px-6 py-3 rounded-2xl border border-emerald-500/20">
              <BiCheckCircle className="text-emerald-500" size={20} />
              <h1 className="text-xs font-bold text-emerald-600 st">Verified</h1>
            </div>
          ) : (
            <Badge label="Verification Pending" status="warning" />
          )}
        </div>
      </Card>
    </>
  );
}
