"use client";

import React from "react";
import { BiUser, BiMobileAlt, BiEnvelope, BiLoaderAlt } from "react-icons/bi";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  saId: string;
  role: string;
  mfaEnabled: boolean;
  avatarUrl: string | null;
  status: string;
}

interface IdentityTabProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  isSaving: boolean;
  handleSaveProfile: () => void;
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

export default function IdentityTab({
  user,
  setUser,
  isSaving,
  handleSaveProfile,
}: IdentityTabProps) {
  return (
    <Card className="p-8 space-y-8 rounded-lg border-slate-100 shadow-slate-900/5 animate-in slide-in-from-left-4 duration-500">
      <SectionHead
        icon={<BiUser size={24} />}
        title="Biological Identity"
        sub="Primary account coordinates and access keys"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <Input
          label="First Name"
          value={user.firstName}
          onChange={(e) =>
            setUser((prev) =>
              prev ? { ...prev, firstName: e.target.value } : null,
            )
          }
          className="bg-slate-50/50 border-slate-100 focus:bg-white transition-all"
        />
        <Input
          label="Last Name"
          value={user.lastName}
          onChange={(e) =>
            setUser((prev) =>
              prev ? { ...prev, lastName: e.target.value } : null,
            )
          }
          className="bg-slate-50/50 border-slate-100 focus:bg-white"
        />
        <Input
          label="Mobile Connectivity"
          icon={<BiMobileAlt />}
          value={user.mobile}
          onChange={(e) =>
            setUser((prev) =>
              prev ? { ...prev, mobile: e.target.value } : null,
            )
          }
          placeholder="+27 XX XXX XXXX"
          className="bg-slate-50/50 border-slate-100 focus:bg-white"
        />
        <Input
          label="Verified Email"
          icon={<BiEnvelope />}
          value={user.email}
          disabled
          className="opacity-60 bg-slate-100 border-slate-200 cursor-not-allowed font-medium"
        />
        <Input
          label="National Identification"
          value={user.saId || "LOCKED / ENCRYPTED"}
          disabled
          className="opacity-60 bg-slate-100 border-slate-200 cursor-not-allowed"
        />
      </div>
      <div className="flex justify-end mt-8 pt-6 border-t border-slate-50">
        <Button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="h-14 rounded-2xl px-10 text-sm font-bold bg-primary text-white"
        >
          {isSaving ? (
            <BiLoaderAlt className="animate-spin" size={20} />
          ) : (
            "Update Profile"
          )}
        </Button>
      </div>
    </Card>
  );
}
