import React, { useState, useEffect } from "react";
import { BiVideo, BiPhoneCall, BiLoaderAlt } from "react-icons/bi";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useSearchParams } from "next/navigation";

export interface ActiveCallInfo {
  roomUrl: string;
  token: string;
  callId: string;
  type: "video" | "voice";
  participantName?: string;
  participantAvatar?: string;
}

export default function CallButton({
  consultationId,
  conversationId,
  role,
  participantName,
  participantAvatar,
  onCallStart,
  onCallEnd,
}: {
  consultationId?: string;
  conversationId?: string;
  role: string;
  participantName?: string;
  participantAvatar?: string;
  onCallStart?: (info: ActiveCallInfo) => void;
  onCallEnd?: () => void;
}) {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const [callActive, setCallActive] = useState(false);
  const [autoJoinAvailable, setAutoJoinAvailable] = useState(false);
  const [pendingRoomInfo, setPendingRoomInfo] = useState<ActiveCallInfo | null>(
    null,
  );
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    const autoStart = searchParams.get("autoStart");
    if (autoStart === "true") {
      startCall("video");
    }
  }, []); // Only on mount

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!consultationId && !conversationId) return;
      try {
        const endpoint = consultationId
          ? `/api/chat/call/status/${consultationId}`
          : `/api/chat/call/status/direct/${conversationId}`;

        const res = await fetch(endpoint);
        const data = await res.json();
        if (data.active && !callActive) {
          setAutoJoinAvailable(true);
          setPendingRoomInfo({
            roomUrl: data.roomUrl,
            token: "",
            callId: data.callId,
            type: "video",
            participantName,
            participantAvatar,
          });
        } else if (!data.active) {
          setAutoJoinAvailable(false);
        }
      } catch (err) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [consultationId, conversationId, callActive]);

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
      if (data.roomUrl) {
        const info: ActiveCallInfo = {
          roomUrl: data.roomUrl,
          token: data.token,
          callId: data.callId,
          type,
          participantName,
          participantAvatar,
        };
        setCallActive(true);
        setAutoJoinAvailable(false);
        onCallStart?.(info);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleEndCall = async (callId: string) => {
    await fetch("/api/chat/call/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId }),
    });
    setCallActive(false);
    onCallEnd?.();
  };

  return (
    <div className="flex gap-2">
      {autoJoinAvailable && pendingRoomInfo && (
        <button
          onClick={() => {
            setCallActive(true);
            setAutoJoinAvailable(false);
            onCallStart?.(pendingRoomInfo);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white font-bold text-xs  tracking-normal rounded-xl hover:bg-rose-600 transition-all animate-pulse"
        >
          JOIN ACTIVE CALL
        </button>
      )}

      {!autoJoinAvailable && (
        <>
          <button
            onClick={() => startCall("voice")}
            disabled={statusLoading || callActive}
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-50"
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
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-50"
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
