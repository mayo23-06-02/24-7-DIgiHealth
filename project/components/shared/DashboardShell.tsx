"use client";

import React from "react";
import { useAuthContext } from "../auth/AuthProvider";
import { BiBrain } from "react-icons/bi";
import Header from "@/components/shared/Header";
import Sidebar from "./Sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
}

const DashboardShell: React.FC<DashboardShellProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isTriageOpen, setIsTriageOpen] = React.useState(false);
  const { user } = useAuthContext();

  return (
    // Root container: fills screen, forbids body scroll
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans selection:bg-primary/10">
      {/* 
          1. SIDEBAR 
          On desktop: It's a standard flex-child (not fixed). Taking up its own column.
          On mobile: It overlays (using position: fixed) managed inside UnifiedSidebar.
      */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* 
          2. MAIN AREA
          - flex-1 makes it fill remaining space
          - flex-col lets us stack Header and Main
          - min-w-0 prevents flex items from overflowing horizontally
      */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        {/* ── HEADER ── */}
        <div className="shrink-0 z-30">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
        </div>

        {/* ── CONTENT AREA ── */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500 custom-scrollbar">
          <div className="max-w-400 mx-auto">{children}</div>
        </main>

        {/* ── FLOATING AI TRIAGE BUTTON (Only for Practitioners) ── */}
        {user?.role === "practitioner" && (
          <>
            <button
              onClick={() => setIsTriageOpen(true)}
              className="fixed bottom-8 right-8 z-[60] w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 animate-in zoom-in group"
              title="Open AI Triage Chat"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75 group-hover:hidden" />
              <BiBrain size={32} className="relative z-10" />

              {/* Optional Tooltip/Badge */}
              <div className="absolute -top-2 -left-2 bg-secondary text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap">
                AI ASSISTANT
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardShell;
