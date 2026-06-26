import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { CallButtonProps, ActiveCallInfo } from "./types";

import { useCall } from "@/components/context/CallContext";

const PATIENT_CALL_WINDOW_LEAD_MS = 5 * 60 * 1000;
const DEFAULT_CALL_WINDOW_MS = 30 * 60 * 1000;

export function useCallManagement({
  consultationId,
  conversationId,
  participantName,
  participantAvatar,
  scheduledAt,
  scheduledEndAt,
  onCallStart,
  onCallEnd,
}: CallButtonProps) {
  const { user } = useAuthContext();
  const { setActiveCall, activeCall, clearCall } = useCall();
  const [autoJoinAvailable, setAutoJoinAvailable] = useState(false);
  const [pendingRoomInfo, setPendingRoomInfo] = useState<ActiveCallInfo | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [incomingAlertOpen, setIncomingAlertOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const isPractitioner = user?.role === "practitioner";
  const scheduledStartMs = scheduledAt ? new Date(scheduledAt).getTime() : null;
  const scheduledEndMs = scheduledEndAt
    ? new Date(scheduledEndAt).getTime()
    : scheduledStartMs ? scheduledStartMs + DEFAULT_CALL_WINDOW_MS : null;
  const isWithinPatientWindow =
    scheduledStartMs !== null &&
    now >= scheduledStartMs - PATIENT_CALL_WINDOW_LEAD_MS &&
    now <= (scheduledEndMs as number);
  const isCallWindowOpen = isPractitioner ? true : isWithinPatientWindow;
  const hasPatientWindowPassed = scheduledEndMs !== null && now > scheduledEndMs;

  const startCall = useCallback(async (type: "video" | "voice") => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/chat/call/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId, conversationId, type, userId: user?.id }),
      });
      const data = await res.json();
      if (res.ok && data.roomUrl && data.token) {
        const info: ActiveCallInfo = {
          roomUrl: data.roomUrl,
          roomName: data.roomName,
          token: data.token,
          callId: data.callId,
          type,
          initiatedBy: data.initiatedBy,
          participantName,
          participantAvatar,
        };
        setIncomingAlertOpen(false);
        setActiveCall(info);
        onCallStart?.(info);
      } else {
        alert(data.error || "Call could not start.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  }, [consultationId, conversationId, user, participantName, participantAvatar, onCallStart]);

  // Poll for active calls
  useEffect(() => {
    if (activeCall) return;
    const interval = setInterval(async () => {
      if (!consultationId && !conversationId) return;
      const endpoint = consultationId
        ? `/api/chat/call/status/${consultationId}`
        : `/api/chat/call/status/direct/${conversationId}`;
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        if (data.active) {
          setAutoJoinAvailable(true);
          setPendingRoomInfo({
            roomUrl: data.roomUrl,
            roomName: data.roomName,
            token: "",
            callId: data.callId,
            type: data.type,
            initiatedBy: data.initiatedBy,
            participantName,
            participantAvatar,
          });
          if (data.initiatedBy && data.initiatedBy !== user?.id) {
            setIncomingAlertOpen(true);
          }
        } else {
          setAutoJoinAvailable(false);
          setIncomingAlertOpen(false);
          if (activeCall) {
            clearCall();
            onCallEnd?.();
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [activeCall, consultationId, conversationId, participantName, participantAvatar, user, onCallEnd]);

  const joinCall = useCallback(async () => {
    if (!pendingRoomInfo) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/chat/call/join/${pendingRoomInfo.callId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join call");
      setAutoJoinAvailable(false);
      setIncomingAlertOpen(false);
      const joinedInfo = {
        roomUrl: data.roomUrl,
        roomName: data.roomName,
        token: data.token,
        callId: data.callId,
        type: data.type,
        initiatedBy: data.initiatedBy,
        participantName,
        participantAvatar,
      };
      setActiveCall(joinedInfo);
      onCallStart?.(joinedInfo);
    } catch (err) {
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  }, [pendingRoomInfo, participantName, participantAvatar, onCallStart]);

  const declineCall = useCallback(async () => {
    if (!pendingRoomInfo) return;
    try {
      await fetch("/api/chat/call/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: pendingRoomInfo.callId }),
      });
      setIncomingAlertOpen(false);
    } catch {}
  }, [pendingRoomInfo]);

  return {
    callActive: !!activeCall,
    autoJoinAvailable,
    pendingRoomInfo,
    incomingAlertOpen,
    statusLoading,
    isCallWindowOpen,
    hasPatientWindowPassed,
    startCall,
    joinCall,
    declineCall,
  };
}