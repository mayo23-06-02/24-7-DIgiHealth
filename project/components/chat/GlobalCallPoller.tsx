"use client";
import { useEffect, useRef } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useCall } from "../context/CallContext";
import toast from "react-hot-toast";

/** Base cadence while the tab is in the foreground. */
const POLL_MS = 6000;
/**
 * Slower cadence while the tab is backgrounded — deliberately slowed rather
 * than stopped. A patient waiting on a doctor may well have the tab behind
 * something else, and silently not noticing an incoming consultation is a much
 * worse failure for a telehealth product than a few extra requests.
 */
const HIDDEN_POLL_MS = 30000;
/** Ceiling used when the server keeps failing, so a bad backend isn't hammered. */
const MAX_BACKOFF_MS = 60000;

export default function GlobalCallPoller() {
  const { setIncomingCall, incomingCall, activeCall } = useCall();
  const { user } = useAuthContext();
  const pollInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorCountRef = useRef(0);
  const toastShownRef = useRef(false);

  /**
   * `incomingCall` and `activeCall` are read inside the poll but kept in refs
   * rather than in the effect's dependency array. They used to be dependencies,
   * which meant every context change tore the interval down, rebuilt it, and
   * fired an extra immediate poll — so the real request rate was higher and far
   * less predictable than the configured interval suggested.
   */
  const incomingRef = useRef(incomingCall);
  const activeRef = useRef(activeCall);
  useEffect(() => {
    incomingRef.current = incomingCall;
  }, [incomingCall]);
  useEffect(() => {
    activeRef.current = activeCall;
  }, [activeCall]);

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
        if (incoming && activeRef.current?.callId !== incoming.callId) {
          // Only set if it's a new incoming call (different callId) and we're not already in it
          if (
            !incomingRef.current ||
            incomingRef.current.callId !== incoming.callId
          ) {
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
          if (
            incomingRef.current &&
            incomingRef.current.initiatedBy !== user.id
          ) {
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

    // Reschedule after each attempt rather than using a fixed interval, so a
    // failing backend backs off instead of being polled at full rate forever.
    const schedule = () => {
      const base =
        typeof document !== "undefined" && document.hidden
          ? HIDDEN_POLL_MS
          : POLL_MS;
      const delay =
        errorCountRef.current > 0
          ? Math.min(base * 2 ** errorCountRef.current, MAX_BACKOFF_MS)
          : base;
      pollInterval.current = setTimeout(run, delay);
    };

    const run = async () => {
      await poll();
      schedule();
    };

    void run();

    // Coming back to the tab should feel instant, so poll straight away rather
    // than waiting out the remainder of the current delay.
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (pollInterval.current) clearTimeout(pollInterval.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // Intentionally excludes incomingCall/activeCall — see the refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, setIncomingCall]);

  return null;
}
