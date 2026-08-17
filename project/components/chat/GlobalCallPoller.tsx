"use client";
import { useEffect, useRef } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useCall } from "../context/CallContext";
import toast from "react-hot-toast";

export default function GlobalCallPoller() {
  const { setIncomingCall, incomingCall, activeCall } = useCall();
  const { user } = useAuthContext();
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/chat/call/active");
        if (!res.ok) return;
        const data = await res.json();
        // Expected: { calls: [{ callId, roomUrl, roomName, type, initiatedBy, participantName, participantAvatar, conversationId, consultationId }] }
        const incoming = data.calls?.find(
          (c: any) => c.initiatedBy !== user.id,
        );
        if (incoming && activeCall?.callId !== incoming.callId) {
          // Only set if it's a new incoming call (different callId) and we're not already in it
          if (!incomingCall || incomingCall.callId !== incoming.callId) {
            setIncomingCall({
              callId: incoming.callId,
              roomUrl: incoming.roomUrl || "",
              roomName: incoming.roomName || "",
              token: "", // token obtained on join
              type: incoming.type,
              initiatedBy: incoming.initiatedBy,
              participantName: incoming.participantName,
              participantAvatar: incoming.participantAvatar,
              conversationId: incoming.conversationId,
              consultationId: incoming.consultationId,
            });
          }
        } else {
          // If there is no incoming call, clear the state (only if we were showing an incoming call)
          if (incomingCall && incomingCall.initiatedBy !== user.id) {
            // But we should only clear if the call is no longer active.
            // We could check the call status, but for simplicity we clear after a short delay.
            // To avoid flickering, we'll clear only if the same callId is gone.
            // The backend should return active calls only.
            setIncomingCall(null);
          }
        }
        // Reset error count and toast flag on success
        errorCountRef.current = 0;
        toastShownRef.current = false;
      } catch (error) {
        errorCountRef.current += 1;
        console.error("Global call poll error:", error);
        // Show toast after 3 consecutive failures, but only once
        if (errorCountRef.current >= 3 && !toastShownRef.current) {
          toast.error("Network connection lost. Please check your internet connection.", {
            id: "network-error",
            duration: 5000,
          });
          toastShownRef.current = true;
        }
      }
    };

    // Poll immediately and then every 3 seconds
    poll();
    pollInterval.current = setInterval(poll, 3000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [user, setIncomingCall, incomingCall, activeCall]);

  return null;
}
