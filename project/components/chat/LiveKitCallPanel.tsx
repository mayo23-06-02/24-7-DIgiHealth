"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrackPublication,
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
  BiExpand,
} from "react-icons/bi";
import { FaCompress } from "react-icons/fa";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(callInfo.type === "video");
  const [elapsed, setElapsed] = useState(0);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  // Track subscribed audio publications in state so React renders real <audio>
  // elements in the DOM — mirrors how @livekit/components-react RoomAudioRenderer works.
  const [remoteAudioPubs, setRemoteAudioPubs] = useState<RemoteTrackPublication[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Use stable primitive deps instead of the callInfo object reference to avoid
  // unnecessary reconnects when the parent re-renders with a new object.
  const { roomUrl, token, type: callType } = callInfo;
  useEffect(() => {
    if (!roomUrl || !token) return;
    let isActive = true;
    const attemptId = connectAttemptRef.current + 1;
    connectAttemptRef.current = attemptId;
    shouldClosePanelRef.current = false;

    const connectRoom = async () => {
      // webAudioMix: true routes remote audio through LiveKit's internal
      // AudioContext pipeline so room.startAudio() can unlock it.
      const room = new Room({ webAudioMix: true });
      roomRef.current = room;

      const syncAudioPubs = () => {
        const pubs = Array.from(room.remoteParticipants.values()).flatMap((p) =>
          Array.from(p.trackPublications.values()).filter(
            (pub) => pub.kind === Track.Kind.Audio && pub.isSubscribed && pub.track,
          ),
        );
        setRemoteAudioPubs(pubs);
      };

      const attachRemoteVideo = () => {
        if (!roomRef.current || roomRef.current.state !== "connected") return;
        const remoteVideo = Array.from(room.remoteParticipants.values())
          .flatMap((p) => Array.from(p.trackPublications.values()))
          .find((pub) => pub.kind === Track.Kind.Video && pub.isSubscribed && pub.track)
          ?.track;
        if (remoteVideo && remoteVideoRef.current) {
          remoteVideo.attach(remoteVideoRef.current);
          setRemoteConnected(true);
        }
      };

      room
        .on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
            track.attach(remoteVideoRef.current);
            setRemoteConnected(true);
          } else if (track.kind === Track.Kind.Audio) {
            syncAudioPubs();
          }
        })
        .on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === Track.Kind.Video) {
            track.detach();
          } else if (track.kind === Track.Kind.Audio) {
            syncAudioPubs();
          }
        })
        .on(RoomEvent.ParticipantDisconnected, () => {
          syncAudioPubs();
          if (room.remoteParticipants.size === 0) {
            setRemoteConnected(false);
            // Other side ended the call — close our panel after a brief moment
            setTimeout(() => {
              if (roomRef.current === room) {
                shouldClosePanelRef.current = true;
                room.disconnect();
              }
            }, 1500);
          }
        })
        .on(RoomEvent.AudioPlaybackStatusChanged, () => {
          setAudioBlocked(!room.canPlaybackAudio);
        })
        .on(RoomEvent.Disconnected, () => {
          setRemoteAudioPubs([]);
          // Fire onEnded for any external disconnect (remote hung up, server deleted room).
          // Cleanup unmount nulls roomRef.current first, so that path is excluded.
          if (roomRef.current === room) {
            onEndedRef.current();
          }
        });

      try {
        await room.connect(roomUrl, token, { autoSubscribe: true });
        await room.startAudio();
        setAudioBlocked(!room.canPlaybackAudio);
      } catch (err) {
        if (isActive) throw err;
        return;
      }

      if (!isActive || connectAttemptRef.current !== attemptId || room.state !== "connected") {
        return;
      }

      try {
        const localAudioTrack = await createLocalAudioTrack();
        await room.localParticipant.publishTrack(localAudioTrack);
        if (callType === "video") {
          const localVideoTrack = await createLocalVideoTrack();
          await room.localParticipant.publishTrack(localVideoTrack);
          if (localVideoRef.current) localVideoTrack.attach(localVideoRef.current);
        }
      } catch (trackErr) {
        console.warn("Failed to publish local tracks:", trackErr);
      }

      attachRemoteVideo();
      syncAudioPubs();
    };

    connectRoom().catch((error) => {
      const message = error instanceof Error ? error.message : String(error ?? "");
      const isCancelledDisconnect =
        !isActive ||
        connectAttemptRef.current !== attemptId ||
        message.toLowerCase().includes("client initiated disconnect");
      if (isCancelledDisconnect) {
        console.warn("Abort connection attempt due to user initiated disconnect", error);
        return;
      }
      console.error("LiveKit connect failed:", error);
      onEndedRef.current();
    });

    return () => {
      isActive = false;
      const room = roomRef.current;
      roomRef.current = null;
      setRemoteAudioPubs([]);
      if (room) {
        shouldClosePanelRef.current = false;
        room.disconnect();
      }
    };
  }, [roomUrl, token, callType]);

  // ── Fullscreen ──
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  // Retry startAudio() on any user interaction — handles browsers that block
  // audio autoplay until a gesture happens inside the call panel.
  const handleContainerClick = useCallback(async () => {
    const room = roomRef.current;
    if (room && !room.canPlaybackAudio) {
      await room.startAudio();
      setAudioBlocked(!room.canPlaybackAudio);
    }
  }, []);

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
      // Null the ref before disconnect so the Disconnected handler doesn't
      // double-fire onEnded() — the server deletes the room which triggers it.
      const room = roomRef.current;
      roomRef.current = null;
      room?.disconnect();
      onEnded();
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className="h-full flex flex-col bg-slate-900 relative overflow-hidden"
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white">
            {callInfo.type === "video" ? "Video" : "Voice"} Consultation
          </span>
        </div>
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="bg-primary px-3 py-2 rounded-full border border-white/10">
            <span className="text-white text-xs font-bold tabular-nums">{fmt(elapsed)}</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <FaCompress size={20} /> : <BiExpand size={20} />}
          </button>
        </div>
      </div>

      {/* Audio renderer — each subscribed audio publication gets a real <audio>
          element in the DOM. Using opacity:0 + 1×1px instead of display:none
          so the browser's autoplay policy allows playback. */}
      <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}>
        {remoteAudioPubs.map((pub) => (
          <audio
            key={pub.trackSid}
            autoPlay
            playsInline
            ref={(el) => {
              if (el && pub.track) pub.track.attach(el);
              else if (!el && pub.track) pub.track.detach();
            }}
          />
        ))}
      </div>

      {/* Audio blocked banner */}
      {audioBlocked && (
        <div className="absolute top-14 inset-x-0 z-30 flex justify-center pointer-events-none">
          <div className="bg-amber-500/90 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg pointer-events-auto">
            Click anywhere to enable audio
          </div>
        </div>
      )}

      {/* Video area */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-950">
          {callInfo.type === "video" ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              muted={false}
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Avatar name={callInfo.participantName || "Participant"} size="xl" />
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
                  Waiting for {callInfo.participantName || "participant"} to join
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-5 z-10">
          <div className="flex items-center gap-3 bg-primary px-4 p-2 rounded-lg border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white text-xs font-bold tracking-tight">
              {callInfo.participantName || "Participant"}
            </span>
          </div>
        </div>

        {callInfo.type === "video" && (
          <div className="absolute top-20 right-4 w-24 h-36 md:w-48 md:h-72 rounded-lg md:rounded-lg overflow-hidden bg-slate-800 border border-white/10">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute left-3 bottom-3 rounded-full bg-black/40 px-2 py-1 text-sm font-bold text-white">
              You
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-5 bg-primary border-t border-white/5 flex items-center justify-center gap-4 shrink-0">
        <button
          onClick={handleToggleMic}
          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white"}`}
        >
          {micOn ? <BiMicrophone size={20} /> : <BiMicrophoneOff size={20} />}
        </button>

        {callInfo.type === "video" && (
          <button
            onClick={handleToggleVideo}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${videoOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white"}`}
          >
            {videoOn ? <BiVideo size={20} /> : <BiVideoOff size={20} />}
          </button>
        )}

        <button
          onClick={handleEnd}
          className="w-16 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center transition-all shadow-rose-900/30"
        >
          <BiPhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}
