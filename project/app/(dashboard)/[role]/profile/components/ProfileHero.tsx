"use client";

import React from "react";
import {
  BiCamera,
  BiLoaderAlt,
  BiShieldQuarter,
  BiCheckCircle,
  BiEnvelope,
  BiPhone,
  BiStar,
  BiIdCard,
  BiBuildings,
  BiBadgeCheck,
} from "react-icons/bi";
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
      <div
        className={`relative h-40 sm:h-48 md:h-56 w-full rounded-lg md:rounded-lg overflow-hidden bg-gradient-to-br ${gradient}  shadow-primary/15`}
      >
        {/* Decorative mesh */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-56 h-56 rounded-full bg-secondary/30 blur-3xl" />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-accent/20 blur-2xl" />
        </div>
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent" />

        <div className="absolute top-4 right-4 sm:top-5 sm:right-6 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                user.status === "active" || !user.status
                  ? "bg-emerald-400"
                  : "bg-amber-300"
              }`}
            />
            {(user.status || "active").toUpperCase()}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
            Profile {completeness}%
          </span>
        </div>
      </div>

      {/* Floating identity card */}
      <div className="relative px-3 sm:px-6 -mt-16 sm:-mt-20">
        <div className="rounded-lg md:rounded-lg bg-white border border-slate-200/80  shadow-slate-200/50 p-4 sm:p-6 md:p-7">
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
                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg p-1 bg-white  shadow-slate-200/80 ring-4 ring-white">
                  <div className="w-full h-full rounded-[0.9rem] overflow-hidden bg-slate-100 flex items-center justify-center">
                    <Avatar
                      name={fullName}
                      src={user.avatarUrl || undefined}
                      size="xl"
                      className="!w-full !h-full !rounded-[0.9rem] !text-3xl"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  title="Change photo"
                  className="absolute -bottom-1.5 -right-1.5 w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center  shadow-primary/30 border-2 border-white hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
                >
                  {isUploadingDoc ? (
                    <BiLoaderAlt size={18} className="animate-spin" />
                  ) : (
                    <BiCamera size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Identity copy */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide">
                    <BiBadgeCheck size={14} />
                    {roleLabel}
                  </span>
                  {user.mfaEnabled ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                      <BiShieldQuarter size={14} />
                      MFA secured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-bold">
                      <BiShieldQuarter size={14} />
                      Enable MFA
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 font-grotesk tracking-tight truncate">
                  {fullName}
                </h1>
                {subtitle && (
                  <p className="text-sm text-slate-500 mt-1 font-medium">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <BiEnvelope className="text-slate-400 shrink-0" size={16} />
                  <span className="truncate">{user.email}</span>
                </span>
                {user.mobile && (
                  <span className="inline-flex items-center gap-1.5">
                    <BiPhone className="text-slate-400 shrink-0" size={16} />
                    {user.mobile}
                  </span>
                )}
              </div>

              {(metaChips.length > 0 || true) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {metaChips.map((chip) => (
                    <span
                      key={chip.label}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-600"
                    >
                      {chip.icon}
                      {chip.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions + completeness ring */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-4 shrink-0">
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
                <div className="relative w-12 h-12 shrink-0">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="#4493b8"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${(completeness / 100) * 97.4} 97.4`}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary tabular-nums">
                    {completeness}%
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Completeness
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {completeness >= 90
                      ? "Excellent"
                      : completeness >= 70
                        ? "Strong"
                        : completeness >= 40
                          ? "In progress"
                          : "Getting started"}
                  </p>
                </div>
              </div>

              {showSave && (
                <Button
                  onClick={onSave}
                  disabled={isSaving}
                  className="!rounded-lg !h-12 !px-6 !max-w-none normal-case !tracking-normal  shadow-primary/20"
                  icon={
                    isSaving ? (
                      <BiLoaderAlt className="animate-spin" size={18} />
                    ) : (
                      <BiCheckCircle size={18} />
                    )
                  }
                  iconPosition="left"
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

// Re-export icons used by parent for meta chips convenience
export { BiStar, BiIdCard, BiBuildings, BiBadgeCheck };
