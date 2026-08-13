"use client";

import React from "react";
import {
  Lock,
  MonitorSmartphone,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Mail,
} from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ProfileSection from "./ProfileSection";

interface Device {
  id: string;
  name: string;
  lastUsed: string;
  active: boolean;
}

interface SecurityTabProps {
  passwordState: any;
  setPasswordState: React.Dispatch<React.SetStateAction<any>>;
  isSaving: boolean;
  handleSavePassword: () => void;
  devices: Device[];
  handleRevokeDevice: (id: string) => void;
  mfaEnabled?: boolean;
  phoneE164?: string | null;
  mobile?: string | null;
  onMfaUpdated?: (data: {
    mfaEnabled: boolean;
    phoneE164?: string;
    phoneMasked?: string;
  }) => void;
  email?: string | null;
}

export default function SecurityTab({
  passwordState,
  setPasswordState,
  isSaving,
  handleSavePassword,
  devices,
  handleRevokeDevice,
  email,
}: SecurityTabProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400">
     

      <ProfileSection
        icon={<Lock size={22} />}
        title="Password"
        description="Rotate your credentials regularly for account safety"
        color="rose"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            label="Current password"
            type="password"
            value={passwordState.currentPassword}
            onChange={(e) =>
              setPasswordState((p: any) => ({
                ...p,
                currentPassword: e.target.value,
              }))
            }
          />
          <Input
            label="New password"
            type="password"
            value={passwordState.newPassword}
            onChange={(e) =>
              setPasswordState((p: any) => ({
                ...p,
                newPassword: e.target.value,
              }))
            }
          />
          <Input
            label="Confirm new password"
            type="password"
            value={passwordState.confirmPassword}
            onChange={(e) =>
              setPasswordState((p: any) => ({
                ...p,
                confirmPassword: e.target.value,
              }))
            }
          />
        </div>
        <div className="mt-6 pt-5 border-t border-slate-200 flex justify-end">
          <Button
            onClick={handleSavePassword}
            loading={isSaving}
            variant="primary"
           
          >
            {isSaving ? "Updating…" : "Update password"}
          </Button>
        </div>
      </ProfileSection>

    </div>
  );
}
