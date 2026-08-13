"use client";

import React from "react";
import Link from "next/link";
import { Users, ArrowLeftRight, Bot } from "lucide-react";
import { useAuthContext } from "../auth/AuthProvider";
import Header from "@/components/shared/Header";
import Sidebar from "./Sidebar";
import { useNavigationProgress } from "@/components/providers/NavigationProgressProvider";
import {
  FamilyMemberProvider,
  useFamilyMembers,
} from "@/lib/family/FamilyMemberContext";
import Button from "../ui/Button";
import PractitionerAIChatPanel from "@/components/dashboard/practitioner/PractitionerAIChatPanel";

interface DashboardShellProps {
  children: React.ReactNode;
}

function ActiveMemberBanner() {
  const { user } = useAuthContext();
  const { activeMember, setActiveMemberId } = useFamilyMembers();
  const [isSwitchingBack, setIsSwitchingBack] = React.useState(false);

  // A child has no login of their own — impersonating one replaces the
  // session cookie outright (see app/api/patient/family/[memberId]/switch),
  // so this reads it straight off the real session rather than client state.
  if (user?.isImpersonating) {
    const switchBack = async () => {
      setIsSwitchingBack(true);
      try {
        await fetch("/api/patient/family/switch-back", { method: "POST" });
      } finally {
        window.location.href = "/patient";
      }
    };
    return (
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-info-500/20 bg-primary px-4 py-2.5">
        <Users size={16} className="text-white shrink-0" />
        <p className="flex-1 min-w-0 text-sm font-medium text-white">
          You&apos;re managing <span className="font-bold">{user.name}</span>&apos;s account
        </p>
        <Button
          onClick={switchBack}
          variant="white"
          disabled={isSwitchingBack}
          size="sm"
        >
          
          {isSwitchingBack ? "Switching back…" : "Switch back to my account"}
        </Button>
      </div>
    );
  }

  // An adult dependent has their own login — the guardian never takes over
  // their session, they just get a read-only management view (see
  // app/(dashboard)/patient/family/[memberId]/page.tsx).
  if (!activeMember) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-info-500/20 bg-info-50 px-4 py-2.5">
      <Users size={16} className="text-info-700 shrink-0" />
      <p className="flex-1 min-w-0 text-sm font-medium text-info-700">
        Managing <span className="font-bold">{activeMember.name}</span>&apos;s
        account
      </p>
      <Link
        href="/patient"
        onClick={() => setActiveMemberId(null)}
        className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-info-700 hover:underline"
      >
        <ArrowLeftRight size={13} />
        Switch to my account
      </Link>
    </div>
  );
}

const DashboardShell: React.FC<DashboardShellProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isTriageOpen, setIsTriageOpen] = React.useState(false);
  const { user } = useAuthContext();
  const { isNavigating } = useNavigationProgress();

  return (
    <FamilyMemberProvider>
      <DashboardShellInner
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isTriageOpen={isTriageOpen}
        setIsTriageOpen={setIsTriageOpen}
        user={user}
        isNavigating={isNavigating}
      >
        {children}
      </DashboardShellInner>
    </FamilyMemberProvider>
  );
};

function DashboardShellInner({
  children,
  isSidebarOpen,
  setIsSidebarOpen,
  isTriageOpen,
  setIsTriageOpen,
  user,
  isNavigating,
}: {
  children: React.ReactNode;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  isTriageOpen: boolean;
  setIsTriageOpen: (v: boolean) => void;
  user: ReturnType<typeof useAuthContext>["user"];
  isNavigating: boolean;
}) {
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
        <main
          aria-busy={isNavigating || undefined}
          className="flex-1 overflow-y-auto overflow-x-hidden p-2 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500 custom-scrollbar"
        >
          <div className="max-w-400 mx-auto">
            <ActiveMemberBanner />
            {children}
          </div>
        </main>

        {/* ── FLOATING AI ASSISTANT BUTTON (Only for Practitioners) ── */}
        {user?.role === "practitioner" && (
          <>
            <button
              onClick={() => setIsTriageOpen(true)}
              className="fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] right-[calc(2rem+env(safe-area-inset-right))] z-[60] w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 animate-in zoom-in group"
              aria-label="Open AI clinical assistant"
              title="Open AI Clinical Assistant"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75 group-hover:hidden" />
              <Bot size={28} className="relative z-10" />

              <div className="absolute -top-2 -left-2 bg-secondary text-[10px] px-2 py-1 rounded-full font-bold whitespace-nowrap">
                AI ASSISTANT
              </div>
            </button>
            <PractitionerAIChatPanel
              isOpen={isTriageOpen}
              onClose={() => setIsTriageOpen(false)}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default DashboardShell;
