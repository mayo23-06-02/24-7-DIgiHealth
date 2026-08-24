"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useCall } from "../context/CallContext";
import { getAblyClient } from "@/lib/ablyClient";
import { getUserCallChannel, ABLY_CONFIG } from "@/config/ably-config";
import toast from "react-hot-toast";

/**
 * Base cadence while the tab is in the foreground and realtime is NOT carrying
 * call signals. When the Ably ring channel is attached, the poll drops to
 * PUSHED_POLL_MS and exists only as a safety net.
 */
const POLL_MS = 6000;
/**
 * Slower cadence while the tab is backgrounded — deliberately slowed rather
 * than stopped. A patient waiting on a doctor may well have the tab behind
 * something else, and silently not noticing an incoming consultation is a much
 * worse failure for a telehealth product than a few extra requests.
 */
const HIDDEN_POLL_MS = 30000;
/**
 * Cadence once invitations arrive by push. The poll is kept rather than removed
 * so a dropped realtime connection degrades to a slower ring instead of a
 * missed consultation — but at this rate it is a backstop, not the mechanism.
 */
const PUSHED_POLL_MS = 60000;
/** Ceiling used when the server keeps failing, so a bad backend isn't hammered. */
const MAX_BACKOFF_MS = 60000;

/** Shape of one entry in /api/chat/call/active's response. */
interface IncomingCallPayload {
  callId: string;
  roomUrl?: string;
  roomName?: string;
  type: "video" | "voice";
  initiatedBy: string;
  participantName?: string;
  participantAvatar?: string;
  conversationId?: string;
  consultationId?: string;
}

export default function GlobalCallPoller() {
  const { setIncomingCall, incomingCall, activeCall, clearCall } = useCall();
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
  /**
   * True once the Ably ring channel is attached, meaning invitations arrive by
   * push and the poll can back right off. A ref rather than state because the
   * poll loop reads it without needing to be torn down and rebuilt.
   */
  const pushedRef = useRef(false);
  const [, forcePollRefresh] = useState(0);
  useEffect(() => {
    incomingRef.current = incomingCall;
  }, [incomingCall]);
  useEffect(() => {
    activeRef.current = activeCall;
  }, [activeCall]);

  /**
   * An invitation is only "incoming" if it is somewhere we are not already.
   *
   * Comparing call ids alone was not enough: two rows could describe the same
   * room, and then each party got rung by the other's row while both were
   * already talking. Room and conversation identity are what actually decide
   * whether this is a new place to go.
   */
  const alreadyPresentFor = useCallback(
    (candidate: { callId?: string; roomName?: string; conversationId?: string }) => {
      const active = activeRef.current;
      if (!active) return false;
      if (active.callId && candidate.callId && active.callId === candidate.callId)
        return true;
      if (active.roomName && candidate.roomName && active.roomName === candidate.roomName)
        return true;
      if (
        active.conversationId &&
        candidate.conversationId &&
        active.conversationId === candidate.conversationId
      )
        return true;
      return false;
    },
    [],
  );

  useEffect(() => {
    if (!user) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/chat/call/active");
        if (!res.ok) return;
        const data = await res.json();
        // Expected: { calls: [{ callId, roomUrl, roomName, type, initiatedBy, participantName, participantAvatar, conversationId, consultationId }] }
        const incoming = (data.calls as IncomingCallPayload[] | undefined)?.find(
          (c) => c.initiatedBy !== user.id && !alreadyPresentFor(c),
        );
        if (incoming) {
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
      const base = pushedRef.current
        ? PUSHED_POLL_MS
        : typeof document !== "undefined" && document.hidden
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
  }, [user, setIncomingCall, clearCall, alreadyPresentFor]);

  /**
   * Realtime ring channel. The server publishes an invitation here the moment a
   * call is created, so the callee rings immediately instead of waiting out a
   * poll interval — and the poll above drops to a slow backstop while this is
   * attached.
   */
  useEffect(() => {
    if (!user || !ABLY_CONFIG.enabled) return;

    let channel: ReturnType<
      ReturnType<typeof getAblyClient>["channels"]["get"]
    > | null = null;
    let cancelled = false;

    try {
      const client = getAblyClient(user.id);
      client.connect();
      channel = client.channels.get(getUserCallChannel(user.id));

      const onIncoming = (msg: { data?: unknown }) => {
        const d = msg?.data as Record<string, unknown> | undefined;
        if (!d?.callId) return;
        // Ignore a ring for a room we are already in, and re-rings of the same
        // invitation, exactly as the poll path does.
        if (
          alreadyPresentFor({
            callId: String(d.callId),
            roomName: d.roomName ? String(d.roomName) : undefined,
            conversationId: d.conversationId ? String(d.conversationId) : undefined,
          })
        )
          return;
        if (incomingRef.current?.callId === d.callId) return;
        setIncomingCall({
          callId: String(d.callId),
          roomUrl: String(d.roomUrl || ""),
          roomName: String(d.roomName || ""),
          token: "", // obtained on join, same as the polled path
          type: d.type as never,
          initiatedBy: String(d.initiatedBy || ""),
          participantName: (d.participantName as string) || "",
          participantAvatar: (d.participantAvatar as string) || "",
          conversationId: String(d.conversationId || ""),
          consultationId: (d.consultationId as string) || undefined,
        });
      };

      const onCleared = (msg: { data?: unknown }) => {
        const d = msg?.data as Record<string, unknown> | undefined;
        if (!d?.callId) return;
        if (incomingRef.current?.callId === d.callId) setIncomingCall(null);
        // The room is no longer torn down underneath a caller when the other
        // side declines, so nothing else would pull them out of it. Ending the
        // call locally is what closes the panel and stops them sitting alone in
        // a room the other party has refused.
        if (activeRef.current?.callId === d.callId) clearCall();
      };

      void channel.subscribe("incoming", onIncoming);
      void channel.subscribe("ended", onCleared);
      void channel.subscribe("declined", onCleared);

      void channel
        .attach()
        .then(() => {
          if (cancelled) return;
          pushedRef.current = true;
          // Nudge the poll loop so it reschedules at the slower backstop rate
          // rather than finishing out the current fast interval.
          forcePollRefresh((n) => n + 1);
        })
        .catch((err: unknown) => {
          // Falling back to polling alone is correct here — a call must still
          // ring if realtime is unavailable.
          console.warn("[GlobalCallPoller] ring channel unavailable", err);
          pushedRef.current = false;
        });
    } catch (err) {
      console.warn("[GlobalCallPoller] realtime setup failed", err);
      pushedRef.current = false;
    }

    return () => {
      cancelled = true;
      pushedRef.current = false;
      try {
        channel?.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [user, setIncomingCall, clearCall, alreadyPresentFor]);

  return null;
}
