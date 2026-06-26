"use client";
import CallNotification from "@/components/chat/CallNotification";
import GlobalCallPoller from "@/components/chat/GlobalCallPoller";
import { CallProvider } from "../context/CallContext";

export default function CallWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CallProvider>
      {children}
      <CallNotification />
      <GlobalCallPoller />
    </CallProvider>
  );
}
