import { useState, useEffect } from "react";
import { BiVideo, BiPhoneCall, BiLoaderAlt } from "react-icons/bi";
import { useAuthContext } from "@/components/auth/AuthProvider";

export interface ActiveCallInfo {
  roomUrl: string;
  roomName: string;
  token: string;
  callId: string;
  type: "video" | "voice";
  initiatedBy?: string;
  participantName?: string;
  participantAvatar?: string;
}

const PATIENT_CALL_WINDOW_LEAD_MS = 4 * 60 * 1000; // window opens 4 min before scheduledAt
const DEFAULT_CALL_WINDOW_MS = 30 * 60 * 1000; // fallback length when no scheduledEndAt is given

export default function CallButton({
  consultationId,
  conversationId,
  participantName,
  participantAvatar,
  scheduledAt,
  scheduledEndAt,
  onCallStart,
  onCallEnd,
}: {
  consultationId?: string;
  conversationId?: string;
  participantName?: string;
  participantAvatar?: string;
  /** ISO string or Date of the scheduled consultation start time */
  scheduledAt?: string | Date;
  /** ISO string or Date the scheduled consultation ends — closes the patient call window */
  scheduledEndAt?: string | Date;
  onCallStart?: (info: ActiveCallInfo) => void;
  onCallEnd?: () => void;
}) {
  const { user } = useAuthContext();
  const [callActive, setCallActive] = useState(false);
  const [autoJoinAvailable, setAutoJoinAvailable] = useState(false);
  const [pendingRoomInfo, setPendingRoomInfo] = useState<ActiveCallInfo | null>(
    null,
  );
  const [statusLoading, setStatusLoading] = useState(false);
  const [incomingAlertOpen, setIncomingAlertOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Refresh current time every 30 s so the window opens automatically
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Gate: practitioners can call patients at any time. Patients can only
  // initiate a call within a short window around the scheduled consultation
  // — opening 4 min before scheduledAt and closing at scheduledEndAt (or 30
  // min after start if no end time is known) — and never if nothing is
  // scheduled at all.
  const isPractitioner = user?.role === "practitioner";
  const scheduledStartMs = scheduledAt
    ? new Date(scheduledAt).getTime()
    : null;
  const scheduledEndMs = scheduledEndAt
    ? new Date(scheduledEndAt).getTime()
    : scheduledStartMs
      ? scheduledStartMs + DEFAULT_CALL_WINDOW_MS
      : null;
  const isWithinPatientWindow =
    scheduledStartMs !== null &&
    now >= scheduledStartMs - PATIENT_CALL_WINDOW_LEAD_MS &&
    now <= (scheduledEndMs as number);
  const isCallWindowOpen = isPractitioner ? true : isWithinPatientWindow;
  const hasPatientWindowPassed =
    scheduledEndMs !== null && now > scheduledEndMs;

  const startCall = async (type: "video" | "voice") => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/chat/call/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId,
          conversationId,
          type,
          userId: user?.id,
        }),
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
        setCallActive(true);
        setAutoJoinAvailable(false);
        setIncomingAlertOpen(false);
        onCallStart?.(info);
      } else if (data.error) {
        alert(data.error);
      } else {
        alert("Call could not start. Check LiveKit configuration.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    // No need to poll while we're already in the call
    if (callActive) return;
    const interval = setInterval(async () => {
      if (!consultationId && !conversationId) return;
      try {
        const endpoint = consultationId
          ? `/api/chat/call/status/${consultationId}`
          : `/api/chat/call/status/direct/${conversationId}`;

        const res = await fetch(endpoint);
        const data = await res.json();
        if (data.active && !callActive) {
          const isIncoming =
            Boolean(data.initiatedBy) && data.initiatedBy !== user?.id;

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
          setIncomingAlertOpen(isIncoming);
        } else if (!data.active) {
          const hadActiveCall =
            callActive || autoJoinAvailable || pendingRoomInfo !== null;

          setAutoJoinAvailable(false);
          setCallActive(false);
          setPendingRoomInfo(null);
          setIncomingAlertOpen(false);

          if (hadActiveCall) {
            onCallEnd?.();
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [
    autoJoinAvailable,
    callActive,
    consultationId,
    conversationId,
    pendingRoomInfo,
    participantAvatar,
    participantName,
    onCallEnd,
    user?.id,
  ]);

  return (
    <div className="relative flex gap-2">
      {incomingAlertOpen && pendingRoomInfo && (
        <div className="absolute top-14 right-0 z-30 w-80 rounded-lg border border-rose-200 bg-white p-4  shadow-rose-900/10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <BiPhoneCall size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold -wide text-rose-500">
                Incoming {pendingRoomInfo.type} call
              </p>
              <p className="truncate text-sm font-semibold text-slate-800">
                {participantName || "Participant"} is calling
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={async () => {
                try {
                  await fetch("/api/chat/call/decline", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ callId: pendingRoomInfo.callId }),
                  });
                  setIncomingAlertOpen(false);
                } catch (err) {
                  console.error(err);
                  setIncomingAlertOpen(false);
                }
              }}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Decline
            </button>
            <button
              onClick={async () => {
                setStatusLoading(true);
                try {
                  const res = await fetch(
                    `/api/chat/call/join/${pendingRoomInfo.callId}`,
                    {
                      method: "POST",
                    },
                  );
                  const data = await res.json();
                  if (!res.ok) {
                    throw new Error(data.error || "Failed to join call");
                  }

                  setCallActive(true);
                  setAutoJoinAvailable(false);
                  setIncomingAlertOpen(false);
                  onCallStart?.({
                    roomUrl: data.roomUrl,
                    roomName: data.roomName,
                    token: data.token,
                    callId: data.callId,
                    type: data.type,
                    initiatedBy: data.initiatedBy,
                    participantName,
                    participantAvatar,
                  });
                } catch (error) {
                  console.error(error);
                } finally {
                  setStatusLoading(false);
                }
              }}
              className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Join now
            </button>
          </div>
        </div>
      )}

      {autoJoinAvailable && pendingRoomInfo && (
        <button
          onClick={async () => {
            setStatusLoading(true);
            try {
              const res = await fetch(
                `/api/chat/call/join/${pendingRoomInfo.callId}`,
                {
                  method: "POST",
                },
              );
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data.error || "Failed to join call");
              }

              setCallActive(true);
              setAutoJoinAvailable(false);
              onCallStart?.({
                roomUrl: data.roomUrl,
                roomName: data.roomName,
                token: data.token,
                callId: data.callId,
                type: data.type,
                initiatedBy: data.initiatedBy,
                participantName,
                participantAvatar,
              });
              setIncomingAlertOpen(false);
            } catch (error) {
              console.error(error);
            } finally {
              setStatusLoading(false);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white font-bold text-xs -normal rounded-lg hover:bg-rose-600 transition-all animate-pulse"
        >
          {pendingRoomInfo.initiatedBy === user?.id
            ? "RETURN TO CALL"
            : "JOIN ACTIVE CALL"}
        </button>
      )}

      {!autoJoinAvailable && isPractitioner && (
        <>
          <button
            onClick={() => startCall("voice")}
            disabled={statusLoading || callActive}
            className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-50"
            title="Voice Call"
          >
            {statusLoading ? (
              <BiLoaderAlt className="animate-spin" />
            ) : (
              <BiPhoneCall size={20} />
            )}
          </button>
          <button
            onClick={() => startCall("video")}
            disabled={statusLoading || callActive}
            className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-50"
            title="Video Call"
          >
            {statusLoading ? (
              <BiLoaderAlt className="animate-spin" />
            ) : (
              <BiVideo size={20} />
            )}
          </button>
        </>
      )}
    </div>
  );
}
