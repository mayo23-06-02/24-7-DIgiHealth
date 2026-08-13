"use client";

import React from "react";
import { User, Smartphone, Mail, Lock, IdCard, CheckCircle2 } from "lucide-react";
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
        icon={<User size={22} />}
        title="Personal identity"
        description="Your legal name and contact details used across DigiHealth"
        color="primary"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
          <Input
            label="First name"
            value={user.firstName}
            onChange={(e) =>
              setUser((prev) =>
                prev ? { ...prev, firstName: e.target.value } : null,
              )
            }
          />
          <Input
            label="Last name"
            value={user.lastName}
            onChange={(e) =>
              setUser((prev) =>
                prev ? { ...prev, lastName: e.target.value } : null,
              )
            }
          />
          <Input
            label="Mobile number"
            icon={<Smartphone size={16} />}
            value={user.mobile}
            onChange={(e) =>
              setUser((prev) =>
                prev ? { ...prev, mobile: e.target.value } : null,
              )
            }
            placeholder="+27 XX XXX XXXX"
          />
          <div className="space-y-1.5">
            <Input
              label="Email address"
              icon={<Mail size={16} />}
              value={user.email}
              disabled
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1 px-1">
              <Lock size={12} />
              Email is verified and locked for security
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Changes apply to consultations, prescriptions, and messages.
          </p>
          <Button
            onClick={handleSaveProfile}
            loading={isSaving}
            icon={<CheckCircle2 size={18} />}
            iconPosition="left"
            className="shrink-0"
          >
            {isSaving ? "Saving…" : "Save identity"}
          </Button>
        </div>
      </ProfileSection>

    </div>
  );
}
