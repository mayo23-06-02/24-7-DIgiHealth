"use client";

import React from "react";
import UnifiedSidebar from "./UnifiedSidebar";
import UnifiedHeader from "./UnifiedHeader";
import { useAuthContext } from "../auth/AuthProvider";

interface DashboardShellProps {
  children: React.ReactNode;
}

const DashboardShell: React.FC<DashboardShellProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { user } = useAuthContext();

  return (
    // Root container: fills screen, forbids body scroll
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans selection:bg-primary/10">
      {/* 
          1. SIDEBAR 
          On desktop: It's a standard flex-child (not fixed). Taking up its own column.
          On mobile: It overlays (using position: fixed) managed inside UnifiedSidebar.
      */}
      <UnifiedSidebar
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
          <UnifiedHeader onMenuClick={() => setIsSidebarOpen(true)} />
        </div>

        {/* ── CONTENT AREA ── */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
