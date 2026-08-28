"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";
import { BiTime, BiArrowBack, BiCalendarEdit, BiCheckCircle, BiLoaderAlt } from "react-icons/bi";
import { useNavigate } from "@/hooks/useNavigate";
import { useServerClock } from "@/hooks/useServerClock";
import { noteServerTime } from "@/lib/time/serverClock";
import {
  isJoinable,
  sessionStateAt,
  sessionWindow,
  type SessionState,
} from "@/lib/consultations/window";
import { useConsultationPresence } from "@/hooks/useConsultationPresence";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { ActiveCallInfo } from "@/components/chat/CallButton";

const LiveKitCallPanel = dynamic(() => import("@/components/chat/LiveKitCallPanel"), {
  ssr: false,
});

interface SessionPayload {
  state: SessionState;
  serverNow: string;
  opensAt: string;
  startsAt: string;
  endsAt: string;
  closesAt: string;
  consultationStatus: string;
  contact: { id: string; name: string };
  type: "video" | "voice";
  roomUrl?: string;
  roomName?: string;
  token?: string;
  callId?: string;
  conversationId?: string;
}

function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

/**
 * The whole of a scheduled consultation, from "too early" through to "over",
 * in one route.
 *
 * The point of it being one route is that nothing navigates at the moment the
 * appointment starts. The old flow pushed lobby → messages → call, so the
 * transition landed the user on the conversation list while a call was
 * negotiated behind it; what they saw was the wrong page, for a second, every
 * time. Here the token is already in hand before the start time arrives and the
 * switch to the call is a state change in a component that is already mounted.
 *
 * The state is derived locally, every second, from the server-issued window —
 * not from whatever the last fetch happened to say. That is what keeps the two
 * participants in step: both are evaluating the same window against the same
 * corrected clock, so they cross into `live` together.
 */
export default function ConsultationRoom({
  userType,
}: {
  userType: "patient" | "practitioner";
}) {
  const params = useParams<{ id: string }>();
  const consultationId = params.id as string;
  const searchParams = useSearchParams();
  const { navigate } = useNavigate();
  const now = useServerClock(1000);

  const [session, setSession] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Set when the user hangs up, so we offer a rejoin rather than yanking them elsewhere. */
  const [left, setLeft] = useState(false);
  const fetchingRef = useRef(false);

  /** Avatar isn't stored on the user record, so it rides in from the caller. */
  const contactAvatar = searchParams.get("avatar") || undefined;

  const loadSession = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch(`/api/consultations/${consultationId}/session`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "This consultation could not be opened.");
        return;
      }
      // Adopt the server's clock before anything derives a state from it.
      noteServerTime(data.serverNow);
      setSession(data as SessionPayload);
      setError(null);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [consultationId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const sessionWin = useMemo(
    () =>
      session
        ? sessionWindow(new Date(session.startsAt), new Date(session.endsAt))
        : null,
    [session],
  );

  /**
   * Live state, recomputed each tick. A consultation that the server already
   * called terminal stays closed regardless of the clock.
   */
  const state: SessionState | null = useMemo(() => {
    if (!session || !sessionWin) return null;
    if (session.state === "closed") return "closed";
    return sessionStateAt(now, sessionWin);
  }, [session, sessionWin, now]);

  const hasToken = Boolean(session?.token && session?.roomUrl);

  /**
   * Pick up a token the moment the window allows one.
   *
   * Opening the page early means the first fetch came back without a token —
   * there was none to give yet. Crossing into the lobby is the cue to ask
   * again, which is also the prefetch: by the time the start arrives the token
   * has been sitting in state for minutes, and entering the call costs no
   * round-trip at all.
   */
  useEffect(() => {
    if (!state || hasToken || loading) return;
    if (!isJoinable(state)) return;
    void loadSession();
  }, [state, hasToken, loading, loadSession]);

  const presence = useConsultationPresence({
    consultationId,
    // Announce ourselves from the lobby onwards; there is nothing to say while
    // the session is still hours away.
    enabled: Boolean(state && (state === "lobby" || state === "live")),
  });

  const callInfo: ActiveCallInfo | null = useMemo(() => {
    if (!session?.token || !session.roomUrl || !session.roomName || !session.callId)
      return null;
    return {
      roomUrl: session.roomUrl,
      roomName: session.roomName,
      token: session.token,
      callId: session.callId,
      type: session.type,
      participantName: session.contact.name,
      participantAvatar: contactAvatar,
    };
  }, [session, contactAvatar]);

  const handleEnded = useCallback(() => setLeft(true), []);

  /**
   * While standing outside, keep checking whether the other party is still in.
   *
   * Asked of LiveKit rather than of Ably presence, so the answer is about the
   * room itself and holds even where realtime presence is switched off. It is
   * the difference between "they're waiting for you, go back in" and a blank
   * screen that tells someone nothing.
   */
  const [otherInRoom, setOtherInRoom] = useState<boolean | null>(null);
  useEffect(() => {
    if (!left || state !== "live") {
      setOtherInRoom(null);
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`/api/consultations/${consultationId}/presence`);
        const data = await res.json();
        if (!cancelled) setOtherInRoom(data.known ? Boolean(data.otherInRoom) : null);
      } catch {
        /* keep the last known answer */
      }
    };
    void check();
    const timer = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [left, state, consultationId]);

  const rejoin = useCallback(() => {
    setLeft(false);
    // The token we hold may belong to a call that has since been closed out;
    // asking again is cheap and always returns the current one.
    void loadSession();
  }, [loadSession]);

  const [ending, setEnding] = useState(false);
  /**
   * Declare the consultation finished. Practitioner only — see the route.
   *
   * Distinct from hanging up: leaving the room is "I've stepped out", ending
   * it is "this encounter is concluded". Conflating the two is why every
   * consultation was being recorded as completed regardless of whether anyone
   * turned up.
   */
  const endConsultation = useCallback(async () => {
    setEnding(true);
    try {
      await fetch(`/api/consultations/${consultationId}/complete`, {
        method: "POST",
      });
    } finally {
      setEnding(false);
      // Re-read rather than assuming: the server decides the final status.
      await loadSession();
      setLeft(false);
    }
  }, [consultationId, loadSession]);

  const appointmentsHref = `/${userType}/appointments`;

  /* ------------------------------ rendering ----------------------------- */

  if (loading && !session) {
    return (
      <Shell>
        <div className="w-14 h-14 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-slate-600 font-semibold">Loading your consultation…</p>
      </Shell>
    );
  }

  if (error || !session || !state) {
    return (
      <Shell>
        <h2 className="text-xl font-bold text-slate-800">
          This consultation isn&apos;t available
        </h2>
        <p className="text-slate-500">{error || "We couldn't load it."}</p>
        <Button variant="outline" fullWidth onClick={() => navigate(appointmentsHref)}>
          Back to appointments
        </Button>
      </Shell>
    );
  }

  // Live and holding a token: the call fills the view. No navigation happened
  // to get here — this is the same component that was showing the countdown.
  if (state === "live" && callInfo && !left) {
    return (
      <div className="flex flex-col h-[calc(100dvh-64px)] -m-2 lg:-m-8 bg-slate-900 overflow-hidden">
        <LiveKitCallPanel
          callInfo={callInfo}
          onEnded={handleEnded}
          // The room belongs to the appointment, not to whoever is in it. If
          // the other party drops, stay — they may be coming back.
          closeWhenAlone={false}
          // Drives the closing-minutes countdown. This is the booked end, not
          // the grace period: the warning is about the slot running out, and
          // the room staying joinable afterwards is a separate courtesy.
          endsAt={new Date(session.endsAt)}
        />
      </div>
    );
  }

  if (state === "closed") {
    // Say which of the two it was. "Missed" is not a failure message — it is
    // the difference between a consultation the patient should be charged and
    // notes written for, and one they should be able to rebook.
    const missed = session.consultationStatus === "missed";
    return (
      <Shell>
        {missed ? (
          <BiCalendarEdit className="mx-auto text-5xl text-amber-500" />
        ) : (
          <BiCheckCircle className="mx-auto text-5xl text-emerald-500" />
        )}
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {missed ? "This consultation didn't take place" : "Consultation complete"}
          </h2>
          <p className="text-slate-500 mt-1">
            {missed ? (
              <>
                The session with{" "}
                <span className="font-semibold text-slate-700">
                  {session.contact.name}
                </span>{" "}
                closed without both of you joining. You can book another time.
              </>
            ) : (
              <>
                Your consultation with{" "}
                <span className="font-semibold text-slate-700">
                  {session.contact.name}
                </span>{" "}
                is finished.
              </>
            )}
          </p>
        </div>
        <Button variant="outline" fullWidth onClick={() => navigate(appointmentsHref)}>
          Back to appointments
        </Button>
      </Shell>
    );
  }

  if (left) {
    // LiveKit's answer is about the room itself, so prefer it; fall back to
    // Ably presence, which at least knows whether they still have the page open.
    const stillThere = otherInRoom ?? (presence.available ? presence.otherPresent : null);

    return (
      <Shell>
        <Avatar name={session.contact.name} src={contactAvatar} size="xl" className="mx-auto" />
        <div>
          <h2 className="text-xl font-bold text-slate-800">You left the consultation</h2>
          {stillThere === true ? (
            <p className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {session.contact.name} is still in the room, waiting for you
            </p>
          ) : (
            <p className="text-slate-500 mt-1">
              {stillThere === false
                ? `${session.contact.name} has left too. You can still rejoin while the session is open.`
                : "You can rejoin at any time while the session is open."}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button fullWidth onClick={rejoin}>
            Rejoin
          </Button>
          {userType === "practitioner" ? (
            <Button
              variant="outline"
              icon={<BiCheckCircle size={16} />}
              iconPosition="left"
              onClick={endConsultation}
              loading={ending}
              fullWidth
            >
              End consultation
            </Button>
          ) : (
            <Button
              variant="ghost"
              fullWidth
              onClick={() => navigate(appointmentsHref)}
            >
              Back to appointments
            </Button>
          )}
        </div>
        {userType === "practitioner" && (
          <p className="text-xs text-slate-400">
            Ending marks this consultation complete and closes the room for both
            of you.
          </p>
        )}
      </Shell>
    );
  }

  /*
   * Live, but without a token in hand.
   *
   * Only reachable by opening the page after the start — the prefetch means
   * anyone who waited through the lobby already holds theirs. Showing a
   * countdown reading 00:00 here would be a lie about what is happening.
   */
  if (state === "live") {
    return (
      <Shell>
        <div className="w-14 h-14 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-slate-600 font-semibold">
          Connecting you to {session.contact.name}…
        </p>
      </Shell>
    );
  }

  // "early" and "lobby" share a face: a countdown plus who else is here. The
  // only difference is what they are counting down to.
  const target = state === "early" ? new Date(session.opensAt) : new Date(session.startsAt);
  const msLeft = target.getTime() - now.getTime();

  return (
    <Shell>
      <Avatar name={session.contact.name} src={contactAvatar} size="xl" className="mx-auto" />
      <div>
        <h2 className="text-xl font-bold text-slate-800">Waiting to begin</h2>
        <p className="text-slate-500 mt-1">
          Your consultation with{" "}
          <span className="font-semibold text-slate-700">{session.contact.name}</span>{" "}
          will begin automatically.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-lg py-6">
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          <BiTime size={14} />
          {state === "early" ? "Lobby opens in" : "Starts in"}
        </div>
        <p className="text-4xl font-bold tabular-nums text-primary">
          {formatCountdown(msLeft)}
        </p>
      </div>

      <PresenceLine
        contactName={session.contact.name}
        otherPresent={presence.otherPresent}
        available={presence.available}
      />

      <p className="text-xs text-slate-400">
        {hasToken
          ? "You're ready — you'll be taken into the room the moment it starts. No need to refresh."
          : "Preparing your secure room…"}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="ghost"
          icon={<BiArrowBack size={16} />}
          iconPosition="left"
          onClick={() => navigate(appointmentsHref)}
          fullWidth
        >
          Leave lobby
        </Button>
        <Button
          variant="outline"
          icon={<BiCalendarEdit size={16} />}
          iconPosition="left"
          onClick={() => navigate(appointmentsHref)}
          fullWidth
        >
          Reschedule instead
        </Button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 border border-slate-100">
        {children}
      </Card>
    </div>
  );
}

/**
 * Who else is here.
 *
 * This is what replaces ringing. Nobody needs to be summoned to a meeting they
 * already agreed to — they need to know whether the other person has turned up
 * yet, which a ring never actually told them.
 */
function PresenceLine({
  contactName,
  otherPresent,
  available,
}: {
  contactName: string;
  otherPresent: boolean;
  available: boolean;
}) {
  if (!available) return null;

  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      {otherPresent ? (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-emerald-700">
            {contactName} is here
          </span>
        </>
      ) : (
        <>
          <BiLoaderAlt className="animate-spin text-slate-400" size={14} />
          <span className="text-slate-500">Waiting for {contactName}…</span>
        </>
      )}
    </div>
  );
}
