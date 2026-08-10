"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";

export interface FamilyMemberSummary {
  id: string;
  name: string;
  email: string | null;
  relationship: string;
  isMinor: boolean;
}

interface FamilyMemberContextValue {
  /** The guardian's active (accepted) linked members — children and adults alike. */
  members: FamilyMemberSummary[];
  /** The member currently being "viewed as", or null when viewing the guardian's own account. */
  activeMember: FamilyMemberSummary | null;
  setActiveMemberId: (id: string | null) => void;
  isLoading: boolean;
}

const FamilyMemberContext = createContext<FamilyMemberContextValue>({
  members: [],
  activeMember: null,
  setActiveMemberId: () => {},
  isLoading: false,
});

export const useFamilyMembers = () => useContext(FamilyMemberContext);

/**
 * Only patients can be guardians (see design.md's family-accounts feature),
 * so this fetches nothing for other roles. Active member selection is
 * per-browser, keyed by guardian id, so it never leaks across accounts on a
 * shared machine.
 */
export function FamilyMemberProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [members, setMembers] = useState<FamilyMemberSummary[]>([]);
  const [activeMemberId, setActiveMemberIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  const storageKey = user ? `family-active-member:${user.id}` : null;

  useEffect(() => {
    if (!user || user.role !== "patient") return;
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/patient/family")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.success) return;
        const active: FamilyMemberSummary[] = (json.data.asGuardian || [])
          .filter((l: any) => l.status === "active" && l.member?.id)
          .map((l: any) => ({
            id: l.member.id,
            name: l.member.name,
            email: l.member.email,
            relationship: l.relationship,
            isMinor: l.isMinor,
          }));
        setMembers(active);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          setHasFetchedOnce(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!storageKey) return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored) setActiveMemberIdState(stored);
  }, [storageKey]);

  const setActiveMemberId = useCallback(
    (id: string | null) => {
      setActiveMemberIdState(id);
      if (!storageKey) return;
      if (id) window.localStorage.setItem(storageKey, id);
      else window.localStorage.removeItem(storageKey);
    },
    [storageKey],
  );

  // A revoked/removed member can't stay "active" — fall back to the guardian's
  // own account. Gated on hasFetchedOnce so this doesn't fire against the
  // empty initial `members` array before the real list has loaded.
  useEffect(() => {
    if (
      hasFetchedOnce &&
      activeMemberId &&
      !members.some((m) => m.id === activeMemberId)
    ) {
      setActiveMemberId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, hasFetchedOnce]);

  const activeMember = members.find((m) => m.id === activeMemberId) || null;

  return (
    <FamilyMemberContext.Provider
      value={{ members, activeMember, setActiveMemberId, isLoading }}
    >
      {children}
    </FamilyMemberContext.Provider>
  );
}
