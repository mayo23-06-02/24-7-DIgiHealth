"use client";

import React from "react";
import { BiCamera, BiLoaderAlt, BiBriefcase, BiShieldQuarter, BiCheckCircle } from "react-icons/bi";
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

interface HospitalAdminRoleData {
  department: string;
  permissions: string[];
  facility: {
    name: string;
    facilityType: string;
    contactInfo: { phone: string; email: string };
    address: { city: string; province: string; street?: string };
    bedCapacity: { total: number; generalAvailable: number; icuAvailable: number };
    specialties: string[];
    emergencyServices: boolean;
  };
}

interface ProfileHeroProps {
  fullName: string;
  user: UserProfile;
  currentRole: string;
  hospitalData: HospitalAdminRoleData | null;
  activeTab: string;
  isUploadingDoc: boolean;
  isSaving: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  docInputRef: React.RefObject<HTMLInputElement | null>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDocUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveNotifications: () => void;
  handleSaveRoleData: () => void;
  handleSaveProfile: () => void;
}

export default function ProfileHero({
  fullName,
  user,
  currentRole,
  hospitalData,
  activeTab,
  isUploadingDoc,
  isSaving,
  avatarInputRef,
  docInputRef,
  handleAvatarUpload,
  handleDocUpload,
  handleSaveNotifications,
  handleSaveRoleData,
  handleSaveProfile,
}: ProfileHeroProps) {
  return (
    <section className="relative group">
      <div className="h-64 md:h-80 w-full bg-primary rounded-lg overflow-hidden relative shadow-slate-900/10">
        <div className="absolute inset-0 bg-linear-to-br from-primary/30 via-transparent to-black/60 opacity-60" />
        <div className="absolute inset-0 backdrop-blur-[1px]" />
        <div className="absolute top-0 right-0 w-full h-full">
          <div className="absolute top-10 right-10 w-64 h-64 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full" />
        </div>

        <div className="absolute bottom-10 left-10 right-10 flex flex-col md:flex-row items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            {/* Hidden file inputs */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <input
              ref={docInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={handleDocUpload}
            />
            <div className="relative group/avatar">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg flex items-center justify-center bg-white p-1 overflow-hidden ring-4 ring-white/10 group-hover/avatar:scale-105 transition-transform duration-500">
                <Avatar
                  name={fullName}
                  src={user.avatarUrl || undefined}
                  size="xl"
                />
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingDoc}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center border-4 border-slate-900 hover:scale-110 active:scale-95 transition-all disabled:opacity-60"
              >
                {isUploadingDoc ? (
                  <BiLoaderAlt size={18} className="animate-spin" />
                ) : (
                  <BiCamera size={18} />
                )}
              </button>
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight font-grotesk">
                  {fullName}
                </h1>
              </div>
              <div className="flex items-center gap-4 text-white/60 text-xs font-bold ">
                <span className="flex items-center gap-1.5">
                  <BiBriefcase className="text-white" />
                  {currentRole === "hospital_admin" && hospitalData?.facility?.name
                    ? hospitalData.facility.name
                    : user.role.replace("_", " ")}
                </span>
                <span className="flex items-center gap-1.5">
                  <BiShieldQuarter className="text-white" />
                  {user.mfaEnabled ? "MFA SECURE" : "MFA PENDING"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pb-2">
            <Button
              onClick={() => {
                if (activeTab === "notifications") handleSaveNotifications();
                else if (activeTab === "role-data") handleSaveRoleData();
                else handleSaveProfile();
              }}
              disabled={isSaving}
              className="rounded-2xl h-14 px-8 shadow-primary/30"
            >
              {isSaving ? (
                <BiLoaderAlt className="animate-spin mr-2" />
              ) : (
                <BiCheckCircle className="mr-2" />
              )}
              {isSaving ? "Synchronizing..." : "Commit Updates"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
