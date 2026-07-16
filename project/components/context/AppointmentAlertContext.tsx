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
  threshold: 10 | 5 | 1;
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

export function AppointmentAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeAlert, setActiveAlert] = useState<AppointmentAlertData | null>(
    null,
  );
  // Tracks which (appointmentId, threshold) reminders have already fired,
  // so a dismissed 10-min alert doesn't re-fire, but the 5-min and 1-min
  // reminders still do. In-memory only — resets on reload, which is fine
  // for a soft reminder.
  const shownRef = useRef<Set<string>>(new Set());

  const showAlert = useCallback((alert: AppointmentAlertData) => {
    setActiveAlert(alert);
  }, []);

  const dismissAlert = useCallback(() => setActiveAlert(null), []);

  const hasShown = useCallback((appointmentId: string, threshold: number) => {
    return shownRef.current.has(`${appointmentId}:${threshold}`);
  }, []);

  const markShown = useCallback(
    (appointmentId: string, threshold: number) => {
      shownRef.current.add(`${appointmentId}:${threshold}`);
    },
    [],
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
