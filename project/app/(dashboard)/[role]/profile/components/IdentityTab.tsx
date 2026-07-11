"use client";

import React from "react";
import {
  BiUser,
  BiMobileAlt,
  BiEnvelope,
  BiLoaderAlt,
  BiLockAlt,
  BiIdCard,
  BiCheckCircle,
} from "react-icons/bi";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ProfileSection from "./ProfileSection";

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

export default function IdentityTab({
  user,
  setUser,
  isSaving,
  handleSaveProfile,
}: IdentityTabProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <ProfileSection
        icon={<BiUser size={22} />}
        title="Personal identity"
        description="Your legal name and contact details used across DigiHealth"
        color="primary"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <Input
            label="First name"
            value={user.firstName}
            onChange={(e) =>
              setUser((prev) =>
                prev ? { ...prev, firstName: e.target.value } : null,
              )
            }
            className="bg-slate-50/60 border-slate-200 focus:bg-white transition-colors"
          />
          <Input
            label="Last name"
            value={user.lastName}
            onChange={(e) =>
              setUser((prev) =>
                prev ? { ...prev, lastName: e.target.value } : null,
              )
            }
            className="bg-slate-50/60 border-slate-200 focus:bg-white transition-colors"
          />
          <Input
            label="Mobile number"
            icon={<BiMobileAlt />}
            value={user.mobile}
            onChange={(e) =>
              setUser((prev) =>
                prev ? { ...prev, mobile: e.target.value } : null,
              )
            }
            placeholder="+27 XX XXX XXXX"
            className="bg-slate-50/60 border-slate-200 focus:bg-white transition-colors"
          />
          <div className="space-y-1.5">
            <Input
              label="Email address"
              icon={<BiEnvelope />}
              value={user.email}
              disabled
              className="opacity-70 bg-slate-100 border-slate-200 cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1 px-1">
              <BiLockAlt size={12} />
              Email is verified and locked for security
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Changes apply to consultations, prescriptions, and messages.
          </p>
          <Button
            onClick={handleSaveProfile}
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
            {isSaving ? "Saving…" : "Save identity"}
          </Button>
        </div>
      </ProfileSection>

      <ProfileSection
        icon={<BiIdCard size={22} />}
        title="Verified credentials"
        description="Government ID and role identifiers on file"
        color="slate"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              National ID
            </p>
            <p className="text-sm font-semibold text-slate-700 font-mono tracking-wide">
              {user.saId
                ? `${user.saId.slice(0, 6)}••••${user.saId.slice(-2)}`
                : "Not on file"}
            </p>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <BiLockAlt size={12} /> Encrypted · read-only
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Account role
            </p>
            <p className="text-sm font-semibold text-slate-700 capitalize">
              {user.role?.replace(/_/g, " ") || "—"}
            </p>
            <p className="text-[11px] text-slate-400 mt-2 capitalize">
              Status: {user.status || "active"}
            </p>
          </div>
        </div>
      </ProfileSection>
    </div>
  );
}
