"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from "livekit-client";
import Avatar from "@/components/ui/Avatar";
import {
  BiMicrophone,
  BiMicrophoneOff,
  BiPhoneOff,
  BiVideo,
  BiVideoOff,
} from "react-icons/bi";
import type { ActiveCallInfo } from "@/components/chat/CallButton";

export default function LiveKitCallPanel({
  callInfo,
  onEnded,
}: {
  callInfo: ActiveCallInfo;
  onEnded: () => void;
}) {
  const roomRef = useRef<Room | null>(null);
  const shouldClosePanelRef = useRef(false);
  const connectAttemptRef = useRef(0);
  const onEndedRef = useRef(onEnded);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(callInfo.type === "video");
  const [elapsed, setElapsed] = useState(0);
  const [remoteConnected, setRemoteConnected] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isActive = true;
    const attemptId = connectAttemptRef.current + 1;
    connectAttemptRef.current = attemptId;
    shouldClosePanelRef.current = false;

    const connectRoom = async () => {
      const room = new Room();
      roomRef.current = room;

      const attachRemoteTrack = () => {
        if (!roomRef.current || roomRef.current.state !== "connected") return;

        const remoteVideoPublication = Array.from(
          room.remoteParticipants.values(),
        ).flatMap((participant) =>
          Array.from(participant.trackPublications.values()),
        ).find((pub) => pub.kind === Track.Kind.Video && pub.isSubscribed && pub.track);

        const remoteVideo = remoteVideoPublication?.track;

        if (remoteVideo && remoteVideoRef.current) {
          remoteVideo.attach(remoteVideoRef.current);
          setRemoteConnected(true);
        }
      };

      room
        .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
            // Only attach if participant is still valid
            if (room.remoteParticipants.has(participant.sid)) {
              track.attach(remoteVideoRef.current);
            }
          }
          setRemoteConnected(true);
        })
        .on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
        })
        .on(RoomEvent.ParticipantDisconnected, () => {
          if (room.remoteParticipants.size === 0) {
            setRemoteConnected(false);
          }
        })
        .on(RoomEvent.Disconnected, () => {
          const isCurrentRoom = roomRef.current === room;
          if (!isCurrentRoom || !shouldClosePanelRef.current) {
            return;
          }
          onEndedRef.current();
        });

      try {
        await room.connect(callInfo.roomUrl, callInfo.token, {
          autoSubscribe: true,
        });
      } catch (err) {
        if (isActive) throw err;
        return;
      }

      if (!isActive || connectAttemptRef.current !== attemptId || room.state !== "connected") {
        return;
      }

      // Publish local tracks
      try {
        const localAudioTrack = await createLocalAudioTrack();
        if (room.state === "connected") {
          await room.localParticipant.publishTrack(localAudioTrack);
        }

        if (callInfo.type === "video") {
          const localVideoTrack = await createLocalVideoTrack();
          if (room.state === "connected") {
            await room.localParticipant.publishTrack(localVideoTrack);
            if (localVideoRef.current) {
              localVideoTrack.attach(localVideoRef.current);
            }
          }
        }
      } catch (trackErr) {
        console.warn("Failed to publish local tracks:", trackErr);
      }

      attachRemoteTrack();
    };

    connectRoom().catch((error) => {
      const message =
        error instanceof Error ? error.message : String(error ?? "");
      const isCancelledDisconnect =
        !isActive ||
        connectAttemptRef.current !== attemptId ||
        message.toLowerCase().includes("client initiated disconnect");

      if (isCancelledDisconnect) {
        console.warn(
          "Abort connection attempt due to user initiated disconnect",
          error,
        );
        return;
      }

      console.error("LiveKit connect failed:", error);
      onEndedRef.current();
    });

    return () => {
      isActive = false;
      const room = roomRef.current;
      roomRef.current = null;
      if (room) {
        shouldClosePanelRef.current = false;
        room.disconnect();
      }
    };
  }, [callInfo]); // onEnded intentionally excluded — kept stable via onEndedRef

  const fmt = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const handleToggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;

    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  };

  const handleToggleVideo = async () => {
    const room = roomRef.current;
    if (!room) return;

    const next = !videoOn;
    await room.localParticipant.setCameraEnabled(next);
    setVideoOn(next);
  };

  const handleEnd = async () => {
    try {
      await fetch("/api/chat/call/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: callInfo.callId }),
      });
    } finally {
      shouldClosePanelRef.current = true;
      roomRef.current?.disconnect();
      onEnded();
    }
  };

  return (
    <div className="h-full rounded-l-lg flex flex-col bg-slate-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-20 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white">
            {callInfo.type === "video" ? "Video" : "Voice"} Consultation
          </span>
        </div>
        <div className="bg-primary px-3 py-1.5 rounded-full border border-white/10">
          <span className="text-white text-xs font-bold tabular-nums">
            {fmt(elapsed)}
          </span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-950">
          {callInfo.type === "video" ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              muted={false}
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Avatar
                name={callInfo.participantName || "Participant"}
                size="xl"
              />
            </div>
          )}

          {!remoteConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
              <div className="text-center text-white">
                <Avatar
                  name={callInfo.participantName || "Participant"}
                  src={callInfo.participantAvatar}
                  size="xl"
                />
                <p className="mt-4 text-sm font-semibold">
                  Waiting for {callInfo.participantName || "participant"} to
                  join
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-5 z-10">
          <div className="flex items-center gap-3 bg-primary px-4 py-2.5 rounded-2xl border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white text-xs font-bold tracking-tight">
              {callInfo.participantName || "Participant"}
            </span>
          </div>
        </div>

        {callInfo.type === "video" && (
          <div className="absolute top-20 right-4 w-48 h-72 rounded-2xl overflow-hidden bg-slate-800 border border-white/10">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute left-3 bottom-3 rounded-full bg-black/40 px-2 py-1 text-sm font-bold -wide text-white">
              You
            </div>
          </div>
        )}
      </div>

      <div className="p-5 bg-primary border-t border-white/5 flex items-center justify-center gap-4 shrink-0">
        <button
          onClick={handleToggleMic}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white"}`}
        >
          {micOn ? <BiMicrophone size={20} /> : <BiMicrophoneOff size={20} />}
        </button>

        {callInfo.type === "video" && (
          <button
            onClick={handleToggleVideo}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${videoOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white"}`}
          >
            {videoOn ? <BiVideo size={20} /> : <BiVideoOff size={20} />}
          </button>
        )}

        <button
          onClick={handleEnd}
          className="w-16 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl flex items-center justify-center transition-all  shadow-rose-900/30"
        >
          <BiPhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}
