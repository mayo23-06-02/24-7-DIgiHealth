"use client";
import React, { useState } from "react";
import { FiUser, FiCloudOff, FiMenu } from "react-icons/fi";
import ProfileSettings from "./ProfileSettings";
import AITriageButton from "./AITriageButton";
import EmergencyBanner from "./EmergencyBanner";

interface DashboardLayoutProps {
  user: any;
  isOnline: boolean;
  children: React.ReactNode;
}

export default function DashboardLayout({
  user,
  isOnline,
  children,
}: DashboardLayoutProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        {emergencyOpen && <EmergencyBanner />}

        <div className="container mx-auto px-4 md:px-8 xl:px-12 max-w-[1600px] h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-2xl text-slate-700">
              <FiMenu />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                {user ? `Sawubona, ${user.name.split(" ")[0]}` : "Sawubona"}
              </h1>
              {!isOnline && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-orange-500 uppercase tracking-normal mt-0.5">
                  <FiCloudOff /> Offline Mode
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-3 hover:bg-slate-50 p-2 pr-4 rounded-full transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="w-10 h-10 rounded-full bg-trust-blue text-white flex items-center justify-center font-bold text-lg shadow-none">
                {user?.name?.charAt(0) || <FiUser />}
              </div>
              <span className="hidden md:block font-bold text-slate-700 text-sm">
                My Profile
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 md:px-8 xl:px-12 max-w-[1600px] py-8 md:py-12 relative z-10">
        {children}
      </main>

      {/* Persistent Floating Controls */}
      <AITriageButton showEmergency={() => setEmergencyOpen(true)} />

      {profileOpen && (
        <ProfileSettings user={user} onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
}
