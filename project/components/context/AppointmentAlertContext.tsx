"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export interface AppointmentAlertData {
  appointmentId: string;
  contactId: string;
  contactName: string;
  contactAvatar?: string;
  /** ISO string */
  scheduledStart: string;
  /** Minutes remaining at the moment this fired; `0` means "already under way". */
  threshold: 10 | 5 | 1 | 0;
}

interface AppointmentAlertContextValue {
  activeAlert: AppointmentAlertData | null;
  showAlert: (alert: AppointmentAlertData) => void;
  dismissAlert: () => void;
  hasShown: (appointmentId: string, threshold: number) => boolean;
  markShown: (appointmentId: string, threshold: number) => void;
}

const AppointmentAlertContext =
  createContext<AppointmentAlertContextValue | null>(null);

const STORAGE_KEY = "appointment-reminders-shown";
/** Long enough to cover any single appointment, short enough to self-clean. */
const ENTRY_TTL_MS = 6 * 60 * 60 * 1000;

type ShownMap = Record<string, number>;

/**
 * Which reminders have already fired, kept across reloads.
 *
 * This used to live in a `Set` that reset on every page load, so refreshing at
 * T-3min re-fired the 5-minute reminder — a popup announcing something the user
 * had already been told, and dismissed. Timestamps rather than bare keys so
 * entries expire on their own instead of accumulating for ever.
 */
function readShown(): ShownMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ShownMap;
    const cutoff = Date.now() - ENTRY_TTL_MS;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, at]) => at > cutoff),
    );
  } catch {
    return {};
  }
}

function writeShown(map: ShownMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* private mode / quota — the in-memory copy still dedupes this session */
  }
}

export function AppointmentAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeAlert, setActiveAlert] = useState<AppointmentAlertData | null>(
    null,
  );
  // Lazily hydrated from storage on first read, so the provider stays safe to
  // render on the server.
  const shownRef = useRef<ShownMap | null>(null);

  const shown = useCallback((): ShownMap => {
    if (!shownRef.current) shownRef.current = readShown();
    return shownRef.current;
  }, []);

  const showAlert = useCallback((alert: AppointmentAlertData) => {
    setActiveAlert(alert);
  }, []);

  const dismissAlert = useCallback(() => setActiveAlert(null), []);

  const hasShown = useCallback(
    (appointmentId: string, threshold: number) =>
      `${appointmentId}:${threshold}` in shown(),
    [shown],
  );

  const markShown = useCallback(
    (appointmentId: string, threshold: number) => {
      const map = shown();
      map[`${appointmentId}:${threshold}`] = Date.now();
      writeShown(map);
    },
    [shown],
  );

  return (
    <AppointmentAlertContext.Provider
      value={{ activeAlert, showAlert, dismissAlert, hasShown, markShown }}
    >
      {children}
    </AppointmentAlertContext.Provider>
  );
}

export function useAppointmentAlert() {
  const ctx = useContext(AppointmentAlertContext);
  if (!ctx) {
    throw new Error(
      "useAppointmentAlert must be used within AppointmentAlertProvider",
    );
  }
  return ctx;
}
