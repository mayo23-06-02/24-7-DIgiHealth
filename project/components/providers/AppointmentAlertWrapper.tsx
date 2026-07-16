"use client";
import { AppointmentAlertProvider } from "@/components/context/AppointmentAlertContext";
import AppointmentAlertPoller from "@/components/dashboard/AppointmentAlertPoller";
import AppointmentAlertPopup from "@/components/dashboard/AppointmentAlertPopup";

export default function AppointmentAlertWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppointmentAlertProvider>
      {children}
      <AppointmentAlertPopup />
      <AppointmentAlertPoller />
    </AppointmentAlertProvider>
  );
}
