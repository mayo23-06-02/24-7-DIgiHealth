"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Users, Check, Loader2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useAuthContext } from "@/components/auth/AuthProvider";
import {
  useFamilyMembers,
  type FamilyMemberSummary,
} from "@/lib/family/FamilyMemberContext";

function FamilySwitcherMenu({
  members,
  activeMemberId,
  onChoose,
}: {
  members: FamilyMemberSummary[];
  activeMemberId: string | null;
  onChoose: (id: string | null) => void;
}) {
  return (
    <div className="bg-surface rounded-lg border border-border shadow-lg py-2 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
      <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">
        Switch account
      </p>
      <button
        onClick={() => onChoose(null)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-soft transition-colors ${
          !activeMemberId ? "bg-primary/5" : ""
        }`}
      >
        <Avatar name="Me" size="xs" />
        <span className="flex-1 text-sm font-medium text-ink-900">
          My Account
        </span>
        {!activeMemberId && (
          <Check size={16} className="text-primary shrink-0" />
        )}
      </button>
      <div className="h-px bg-border my-1" />
      {members.map((m) => (
        <button
          key={m.id}
          onClick={() => onChoose(m.id)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-soft transition-colors ${
            activeMemberId === m.id ? "bg-primary/5" : ""
          }`}
        >
          <Avatar name={m.name} size="xs" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">
              {m.name}
            </p>
            <p className="text-[11px] text-ink-400 capitalize">
              {m.relationship}
              {m.isMinor ? " · minor" : ""}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

/**
 * Lets a guardian quickly jump into managing a linked family member's
 * account. Behavior branches on the member's isMinor flag:
 *  - Children have no login of their own, so picking one impersonates them
 *    outright (POST .../switch swaps the session cookie, no password) —
 *    they land on the exact same full patient dashboard a real patient gets.
 *  - Adult dependents keep their own real login; their medical history stays
 *    private (see lib/family/access.ts's canViewMedicalHistory), so picking
 *    one only opens a read-only appointments/management summary page.
 * Renders nothing for non-patients or patients with no active family links
 * (unless the session itself is currently impersonating a child, in which
 * case it still needs to offer a way back to "My Account").
 */
export default function FamilySwitcher({
  variant = "compact",
}: {
  variant?: "compact" | "card";
}) {
  const { user } = useAuthContext();
  const { members, activeMember, setActiveMemberId } = useFamilyMembers();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (user?.role !== "patient") return null;
  if (members.length === 0 && !user.isImpersonating) return null;

  const choose = async (id: string | null) => {
    setIsOpen(false);

    if (!id) {
      if (user.isImpersonating) {
        setIsSwitching(true);
        try {
          await fetch("/api/patient/family/switch-back", { method: "POST" });
        } finally {
          window.location.href = "/patient";
        }
      } else {
        setActiveMemberId(null);
        router.push("/patient");
      }
      return;
    }

    const target = members.find((m) => m.id === id);
    if (target?.isMinor) {
      setIsSwitching(true);
      try {
        const res = await fetch(`/api/patient/family/${id}/switch`, {
          method: "POST",
        });
        if (!res.ok) {
          setIsSwitching(false);
          return;
        }
      } catch {
        setIsSwitching(false);
        return;
      }
      window.location.href = "/patient";
    } else {
      setActiveMemberId(id);
      router.push(`/patient/family/${id}`);
    }
  };

  const label = user.isImpersonating
    ? user.name
    : activeMember
      ? activeMember.name
      : "My Account";

  if (variant === "card") {
    return (
      <div className="px-3 relative" ref={ref}>
        <button
          onClick={() => setIsOpen((v) => !v)}
          disabled={isSwitching}
          aria-label="Switch family member"
          className="w-full flex items-center gap-3 p-2.5 rounded-md bg-surface-soft border border-border hover:border-primary hover:bg-primary/5 transition-all group disabled:opacity-60"
        >
          <Avatar name={label} size="sm" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              {user.isImpersonating || activeMember ? "Managing" : "Viewing"}
            </p>
            <p className="text-sm font-semibold text-ink-900 truncate">
              {label}
            </p>
          </div>
          {isSwitching ? (
            <Loader2 size={16} className="text-ink-400 animate-spin shrink-0" />
          ) : (
            <ChevronDown
              size={16}
              className={`text-ink-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
            />
          )}
        </button>
        {isOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 z-[100]">
            <FamilySwitcherMenu
              members={members}
              activeMemberId={activeMember?.id ?? null}
              onChoose={choose}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        disabled={isSwitching}
        aria-label="Switch family member"
        className={`flex items-center gap-2 rounded-md p-2.5 border border-border transition-all disabled:opacity-60 ${
          isOpen ? "bg-surface-soft" : "hover:bg-surface-soft"
        }`}
      >
        {isSwitching ? (
          <Loader2 size={20} className="text-ink-600 shrink-0 animate-spin" />
        ) : (
          <Users size={20} className="text-ink-600 shrink-0" />
        )}
        <span className="hidden lg:inline text-xs font-semibold text-ink-900 max-w-[100px] truncate">
          {label}
        </span>
        <ChevronDown
          size={14}
          className="text-ink-400 hidden sm:block shrink-0"
        />
      </button>
      {isOpen && (
        <div className="fixed sm:absolute top-16 sm:top-full left-0 sm:left-auto right-0 mx-4 sm:mx-0 sm:mt-2 w-auto sm:w-72 z-[100]">
          <FamilySwitcherMenu
            members={members}
            activeMemberId={activeMember?.id ?? null}
            onChoose={choose}
          />
        </div>
      )}
    </div>
  );
}
