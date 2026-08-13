"use client";

import React from "react";
import {
  Camera,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Phone,
  BadgeCheck,
  User,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
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

interface ProfileHeroProps {
  fullName: string;
  user: UserProfile;
  currentRole: string;
  roleLabel: string;
  subtitle?: string;
  metaChips?: { icon?: React.ReactNode; label: string }[];
  completeness: number;
  activeTab: string;
  isUploadingDoc: boolean;
  isSaving: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveNotifications: () => void;
  handleSaveRoleData: () => void;
  handleSaveProfile: () => void;
}

const ROLE_ACCENT: Record<string, string> = {
  practitioner: "from-[#1a4d66] via-[#2b7a9e] to-[#4493b8]",
  patient: "from-[#0f3d52] via-[#1e6b8a] to-[#53CBF3]",
  hospital_admin: "from-[#1e293b] via-[#334155] to-[#4493b8]",
};

export default function ProfileHero({
  fullName,
  user,
  currentRole,
  roleLabel,
  subtitle,
  metaChips = [],
  completeness,
  activeTab,
  isUploadingDoc,
  isSaving,
  avatarInputRef,
  handleAvatarUpload,
  handleSaveNotifications,
  handleSaveRoleData,
  handleSaveProfile,
}: ProfileHeroProps) {
  const gradient =
    ROLE_ACCENT[currentRole] || ROLE_ACCENT.practitioner;

  const onSave = () => {
    if (activeTab === "notifications") handleSaveNotifications();
    else if (activeTab === "role-data") handleSaveRoleData();
    else if (activeTab === "security") return;
    else handleSaveProfile();
  };

  const showSave =
    activeTab === "general" ||
    activeTab === "role-data" ||
    activeTab === "notifications";

  return (
    <section className="relative">
      {/* Cover */}
      

      {/* Floating identity card */}
      <div className="relative ">
        <div className="rounded-lg bg-white border border-slate-200 p-4 sm:p-6 md:p-7">
          <div className="flex flex-col lg:flex-row lg:items-end gap-5 lg:gap-8">
            {/* Avatar */}
            <div className="relative shrink-0 self-start">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <div className="relative group/avatar">
                <div className="w-16 h-16 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg p-1 bg-white ring-4 ring-white">
                  <div className="w-full h-full rounded-[0.9rem] overflow-hidden bg-surface-soft flex items-center justify-center">
                    <User size={24} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  title="Change photo"
                  aria-label="Change profile photo"
                  className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-primary/30 border-2 border-white hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
                >
                  {isUploadingDoc ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Camera size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Identity copy */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="lg:inline-flex  hidden items-center gap-1 px-3 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide">
                    <BadgeCheck size={14} />
                    {roleLabel}
                  </span>
                
                </div>
                <h1 className="text-xl lg:text-2xl md:text-4xl font-bold text-ink-900 font-grotesk tracking-tight truncate">
                  {fullName}
                </h1>
                {subtitle && (
                  <p className="text-xs uppercase text-green-700 mt-1 font-medium">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Mail className="text-slate-400 shrink-0" size={16} />
                  <span className="truncate">{user.email}</span>
                </span>
                {user.mobile && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="text-slate-400 shrink-0" size={16} />
                    {user.mobile}
                  </span>
                )}
              </div>

              
            </div>

            {/* Actions + completeness ring */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-4 shrink-0">
              

              {showSave && (
                <Button
                  onClick={onSave}
                  loading={isSaving}
                  size="sm"
              
                >
                  {isSaving ? "Saving…" : "Save changes"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
