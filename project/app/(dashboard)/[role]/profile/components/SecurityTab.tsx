"use client";

import React from "react";
import {
  BiLockAlt,
  BiDevices,
  BiTrash,
  BiLoaderAlt,
  BiShieldQuarter,
  BiCheckCircle,
} from "react-icons/bi";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
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
}

export default function SecurityTab({
  passwordState,
  setPasswordState,
  isSaving,
  handleSavePassword,
  devices,
  handleRevokeDevice,
  mfaEnabled,
}: SecurityTabProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <ProfileSection
        icon={<BiLockAlt size={22} />}
        title="Password"
        description="Rotate your credentials regularly for account safety"
        color="rose"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
            className="bg-slate-50/60 border-slate-200 focus:bg-white"
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
            className="bg-slate-50/60 border-slate-200 focus:bg-white"
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
            className="bg-slate-50/60 border-slate-200 focus:bg-white"
          />
        </div>
        <div className="mt-6 pt-5 border-t border-slate-100 flex justify-end">
          <Button
            onClick={handleSavePassword}
            disabled={isSaving}
            variant="primary"
            className="!rounded-lg !h-11 !px-6 !max-w-none normal-case !tracking-normal"
            icon={
              isSaving ? (
                <BiLoaderAlt className="animate-spin" size={18} />
              ) : (
                <BiCheckCircle size={18} />
              )
            }
            iconPosition="left"
          >
            {isSaving ? "Updating…" : "Update password"}
          </Button>
        </div>
      </ProfileSection>

      <ProfileSection
        icon={<BiShieldQuarter size={22} />}
        title="Multi-factor authentication"
        description="An extra layer of protection on sign-in"
        color={mfaEnabled ? "emerald" : "amber"}
      >
        <div
          className={`rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            mfaEnabled
              ? "bg-emerald-50/80 border-emerald-100"
              : "bg-amber-50/80 border-amber-100"
          }`}
        >
          <div>
            <p className="text-sm font-bold text-slate-800">
              {mfaEnabled ? "MFA is enabled" : "MFA is not enabled"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {mfaEnabled
                ? "Your account requires a second factor when signing in."
                : "Enable MFA from identity settings or ask support to strengthen your account."}
            </p>
          </div>
          <span
            className={`shrink-0 text-xs font-bold px-3 py-2 rounded-full ${
              mfaEnabled
                ? "bg-emerald-600 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            {mfaEnabled ? "Protected" : "Recommended"}
          </span>
        </div>
      </ProfileSection>

      <ProfileSection
        icon={<BiDevices size={22} />}
        title="Trusted devices"
        description="Sessions that can access your DigiHealth account"
        color="blue"
      >
        {devices.length === 0 ? (
          <div className="text-center py-10 rounded-lg bg-slate-50 border border-dashed border-slate-200">
            <BiDevices className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="text-sm font-semibold text-slate-500">
              No other devices registered
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Active sessions will appear here
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
            {devices.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-4 py-3.5 bg-white hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <BiDevices size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {d.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Last used{" "}
                      {d.lastUsed
                        ? new Date(d.lastUsed).toLocaleString("en-ZA", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                      {d.active ? " · Active" : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeDevice(d.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <BiTrash size={14} />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>
    </div>
  );
}
