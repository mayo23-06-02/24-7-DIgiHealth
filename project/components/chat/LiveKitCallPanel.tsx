"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrackPublication,
  ConnectionQuality,
  VideoPresets,
  AudioPresets,
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
import { serverNow } from "@/lib/time/serverClock";

/**
 * Capture ladder, lowest → highest.
 *
 * Rather than pinning one safe-but-mediocre resolution for everybody, we start
 * as high as the connection looks able to carry and move along this ladder as
 * LiveKit reports actual call quality. Someone on hotel wifi gets 720p; someone
 * on a congested 3G cell drops to 180p and keeps a working consultation instead
 * of a frozen 720p one.
 */
const CAPTURE_LADDER = [
  VideoPresets.h180,
  VideoPresets.h360,
  VideoPresets.h540,
  VideoPresets.h720,
] as const;

/** Camera restarts are visibly disruptive, so changes are rate-limited. */
const MIN_MS_BETWEEN_CAPTURE_CHANGES = 20000;
/** How long a new quality reading must hold before we act on it. */
const QUALITY_SETTLE_MS = 6000;

/**
 * Opening rung, guessed from the Network Information API before any call
 * statistics exist. Deliberately optimistic when the API says nothing —
 * real quality feedback will pull us down within seconds if we guessed high,
 * whereas guessing low leaves good connections stuck at a poor picture.
 */
function initialLadderIndex(): number {
  const conn = (navigator as any)?.connection;
  if (conn?.saveData) return 0;
  const effective = conn?.effectiveType;
  if (effective === "slow-2g" || effective === "2g") return 0;
  if (effective === "3g") return 1;
  return CAPTURE_LADDER.length - 1;
}

/** Target rung for a reported connection quality, or null if not actionable. */
function ladderIndexForQuality(q: ConnectionQuality): number | null {
  switch (q) {
    case ConnectionQuality.Excellent:
      return 3;
    case ConnectionQuality.Good:
      return 2;
    case ConnectionQuality.Poor:
      // Survival mode — a small moving picture beats a stalled sharp one. The
      // voice-only offer appears alongside this if it stays bad.
      return 0;
    default:
      return null;
  }
}

/** How long before the booked end the remaining-time chip appears. */
const WARN_FROM_SECONDS = 5 * 60;

export default function LiveKitCallPanel({
  callInfo,
  onEnded,
  closeWhenAlone = true,
  endsAt = null,
}: {
  callInfo: ActiveCallInfo;
  onEnded: () => void;
  /**
   * When the booked slot runs out, for a scheduled consultation.
   *
   * Optional because an ad-hoc call has no end — nobody agreed a length for it,
   * so there is nothing to count down to and the chip stays hidden.
   */
  endsAt?: Date | null;
  /**
   * Whether being left alone in the room means the call is over.
   *
   * True for an ad-hoc call: the other person hanging up is the end of it.
   * False for a scheduled consultation, where the room belongs to the
   * appointment rather than to whoever happens to be in it — the other party
   * may be reconnecting, and evicting the one who stayed is exactly the bug
   * that "the doctor got chucked out when the patient dropped" describes.
   */
  closeWhenAlone?: boolean;
}) {
  const roomRef = useRef<Room | null>(null);
  const shouldClosePanelRef = useRef(false);
  const connectAttemptRef = useRef(0);
  const onEndedRef = useRef(onEnded);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  // Read through a ref so changing it never tears down a live connection.
  const closeWhenAloneRef = useRef(closeWhenAlone);
  useEffect(() => { closeWhenAloneRef.current = closeWhenAlone; }, [closeWhenAlone]);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  /* ---------------------------------------------------------------------- */
  /*  Self-view: aspect-preserving and draggable                            */
  /* ---------------------------------------------------------------------- */
  const stageRef = useRef<HTMLDivElement | null>(null);
  const selfViewRef = useRef<HTMLDivElement | null>(null);
  /** Camera's own width/height, read from the track's metadata. 3:4 until known. */
  const [selfAspect, setSelfAspect] = useState(3 / 4);
  /**
   * Position within the stage, in px from the top-left. Null until first
   * placed or dragged, so the tile can sit in its default corner and stay
   * there while the panel is resized.
   */
  const [selfPos, setSelfPos] = useState<{ x: number; y: number } | null>(null);
  const [draggingSelf, setDraggingSelf] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  /**
   * The tile is capped on its longest side, so a portrait camera gets a tall
   * narrow tile and a landscape one a short wide tile — both bounded, neither
   * cropped.
   */
  const selfViewStyle: CSSProperties = (() => {
    const landscape = selfAspect >= 1;
    const cap = 176; // px — the long edge
    const width = landscape ? cap : Math.round(cap * selfAspect);
    const height = landscape ? Math.round(cap / selfAspect) : cap;
    return selfPos
      ? { width, height, left: selfPos.x, top: selfPos.y }
      : { width, height, right: 16, top: 80 };
  })();

  const startDragSelfView = (e: ReactPointerEvent<HTMLDivElement>) => {
    const tile = selfViewRef.current;
    const stage = stageRef.current;
    if (!tile || !stage) return;
    const tileBox = tile.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    // Switch from the default corner anchoring to explicit coordinates at the
    // moment the drag starts, so the tile doesn't jump.
    setSelfPos({ x: tileBox.left - stageBox.left, y: tileBox.top - stageBox.top });
    dragOffset.current = {
      x: e.clientX - tileBox.left,
      y: e.clientY - tileBox.top,
    };
    setDraggingSelf(true);
    tile.setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (!draggingSelf) return;

    const move = (e: PointerEvent) => {
      const tile = selfViewRef.current;
      const stage = stageRef.current;
      if (!tile || !stage) return;
      const stageBox = stage.getBoundingClientRect();
      const tileBox = tile.getBoundingClientRect();
      // Clamped so the tile can be parked against any edge or corner but never
      // dragged out of the call.
      const x = Math.min(
        Math.max(0, e.clientX - stageBox.left - dragOffset.current.x),
        Math.max(0, stageBox.width - tileBox.width),
      );
      const y = Math.min(
        Math.max(0, e.clientY - stageBox.top - dragOffset.current.y),
        Math.max(0, stageBox.height - tileBox.height),
      );
      setSelfPos({ x, y });
    };
    const stop = () => setDraggingSelf(false);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [draggingSelf]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(callInfo.type === "video");
  const [elapsed, setElapsed] = useState(0);

  /**
   * Seconds left of the booked slot, once it is worth saying.
   *
   * Null until the last five minutes, so the chip appears as a warning rather
   * than sitting there ticking for the whole consultation — a clock counting
   * down from the first second changes how people talk to their doctor. It
   * keeps counting past zero into overrun, because the room stays open through
   * the grace period and pretending otherwise would be a lie about what is
   * happening.
   */
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Depend on the timestamp, not the Date object. Callers naturally write
  // `endsAt={new Date(...)}`, which is a new object on every render — keying
  // the effect on that would rebuild the interval once a second.
  const endsAtMs = endsAt ? endsAt.getTime() : null;

  useEffect(() => {
    if (endsAtMs === null) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const left = Math.round((endsAtMs - serverNow().getTime()) / 1000);
      setSecondsLeft(left <= WARN_FROM_SECONDS ? left : null);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAtMs]);
  const [remoteConnected, setRemoteConnected] = useState(false);
  /** They were here and went. Distinguishes "left" from "hasn't arrived yet". */
  const [remoteLeft, setRemoteLeft] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [quality, setQuality] = useState<ConnectionQuality>(
    ConnectionQuality.Unknown,
  );
  const [isReconnecting, setIsReconnecting] = useState(false);
  /** Set once we've offered to drop video, so we don't nag repeatedly. */
  const [suggestVoiceOnly, setSuggestVoiceOnly] = useState(false);
  const poorSinceRef = useRef<number | null>(null);

  // Adaptive capture state. Kept in refs because the quality handler is
  // registered once and must not re-subscribe on every change.
  const localVideoTrackRef = useRef<Awaited<
    ReturnType<typeof createLocalVideoTrack>
  > | null>(null);
  const ladderIndexRef = useRef<number>(CAPTURE_LADDER.length - 1);
  const lastCaptureChangeRef = useRef<number>(0);
  const pendingTargetRef = useRef<{ index: number; since: number } | null>(null);
  const [captureLabel, setCaptureLabel] = useState<string>("");
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
      //
      // Everything below it is bandwidth tuning. The room previously ran on
      // LiveKit defaults with an uncapped camera capture, which on a South
      // African mobile link is the difference between a usable consultation
      // and an unusable one.
      const room = new Room({
        webAudioMix: true,

        // Subscribe at the size actually being rendered rather than full
        // resolution, and pause tracks that aren't visible. The remote feed in
        // this panel is often a few hundred pixels wide — without this we pull
        // a 720p stream to paint it.
        adaptiveStream: true,

        // Stop *sending* simulcast layers nobody is currently subscribed to.
        // Saves the publisher's uplink, which is usually the scarcer direction
        // on mobile.
        dynacast: true,

        publishDefaults: {
          // Multiple quality layers so the server can hand each subscriber the
          // one their connection can actually carry.
          simulcast: true,

          // Audio is the clinically critical channel — a consultation survives
          // degraded video, not degraded speech.
          audioPreset: AudioPresets.speech,
          // Discontinuous transmission: send nothing during silence.
          dtx: true,
          // Redundant audio encoding — materially better speech intelligibility
          // on lossy mobile links, for very little extra bandwidth.
          red: true,

          // When bandwidth is short, give up resolution and framerate together
          // rather than letting either collapse. 'maintain-resolution' is worth
          // trialling if clinicians report they can't see enough detail.
          degradationPreference: "balanced",
        },
      });
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
            // They came back — stop saying they left.
            setRemoteLeft(false);
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
            setRemoteLeft(true);
            // For a consultation, being alone is not the end — stay connected
            // and wait. The session's own window decides when it is over.
            if (!closeWhenAloneRef.current) return;
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
        .on(RoomEvent.ConnectionQualityChanged, (q, participant) => {
          // Only our own uplink is actionable by this user.
          if (participant?.identity !== room.localParticipant.identity) return;
          setQuality(q);

          // ── Adaptive capture ────────────────────────────────────────────
          // Move along the ladder toward the rung this quality warrants, but
          // only once the reading has held for a while and not more often than
          // the rate limit — restarting the camera is visibly disruptive, so
          // oscillating on noisy readings would be worse than a wrong rung.
          const target = ladderIndexForQuality(q);
          if (target !== null && localVideoTrackRef.current) {
            if (target === ladderIndexRef.current) {
              pendingTargetRef.current = null;
            } else {
              const now = Date.now();
              const pending = pendingTargetRef.current;

              if (!pending || pending.index !== target) {
                pendingTargetRef.current = { index: target, since: now };
              } else if (
                now - pending.since >= QUALITY_SETTLE_MS &&
                now - lastCaptureChangeRef.current >= MIN_MS_BETWEEN_CAPTURE_CHANGES
              ) {
                // Step one rung at a time so we glide rather than jump; a
                // genuinely bad link will keep reporting Poor and keep pulling
                // us down on subsequent ticks.
                const next =
                  target > ladderIndexRef.current
                    ? ladderIndexRef.current + 1
                    : ladderIndexRef.current - 1;
                const preset = CAPTURE_LADDER[next];

                ladderIndexRef.current = next;
                lastCaptureChangeRef.current = now;
                pendingTargetRef.current = null;

                void localVideoTrackRef.current
                  .restartTrack({ resolution: preset.resolution })
                  .then(() => setCaptureLabel(`${preset.resolution.height}p`))
                  .catch((e) =>
                    console.warn("Adaptive capture change failed:", e),
                  );
              }
            }
          }

          // Offer voice-only after quality has been Poor for a sustained
          // stretch — not on the first blip, and never automatically, because
          // silently killing a clinician's camera mid-examination is worse
          // than a degraded picture. The user decides.
          if (q === ConnectionQuality.Poor) {
            if (poorSinceRef.current === null) {
              poorSinceRef.current = Date.now();
            } else if (Date.now() - poorSinceRef.current > 8000) {
              setSuggestVoiceOnly(true);
            }
          } else {
            poorSinceRef.current = null;
          }
        })
        .on(RoomEvent.Reconnecting, () => setIsReconnecting(true))
        .on(RoomEvent.Reconnected, () => {
          setIsReconnecting(false);
          poorSinceRef.current = null;
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
          // Open at the highest rung this connection plausibly supports rather
          // than a fixed low default; ConnectionQualityChanged then moves us
          // up or down from here.
          const startIndex = initialLadderIndex();
          ladderIndexRef.current = startIndex;
          const startPreset = CAPTURE_LADDER[startIndex];
          setCaptureLabel(`${startPreset.resolution.height}p`);

          const localVideoTrack = await createLocalVideoTrack({
            resolution: startPreset.resolution,
          });
          localVideoTrackRef.current = localVideoTrack;
          await room.localParticipant.publishTrack(localVideoTrack, {
            simulcast: true,
            videoEncoding: startPreset.encoding,
          });
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
      localVideoTrackRef.current = null;
      pendingTargetRef.current = null;
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
          {callInfo.type === "video" && captureLabel && (
            <div className="bg-white/10 px-3 py-2 rounded-full border border-white/10">
              <span className="text-white/80 text-xs font-semibold tabular-nums">
                {captureLabel}
              </span>
            </div>
          )}
          {/*
            Time remaining, only in the closing minutes. Amber while it runs
            down, red once the slot is over and the consultation is into its
            grace period.
          */}
          {secondsLeft !== null && (
            <div
              className={`px-3 py-2 rounded-full border ${
                secondsLeft > 0
                  ? "bg-amber-500/90 border-amber-300/30"
                  : "bg-red-500/90 border-red-300/30 animate-pulse"
              }`}
              title={
                secondsLeft > 0
                  ? "Time remaining in this consultation"
                  : "This consultation has run past its booked time"
              }
            >
              <span className="text-white text-xs font-bold tabular-nums">
                {secondsLeft > 0
                  ? `${fmt(secondsLeft)} left`
                  : `+${fmt(Math.abs(secondsLeft))} over`}
              </span>
            </div>
          )}
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

      {/* Connection state banners — stacked so they never overlap. */}
      <div className="absolute top-14 inset-x-0 z-30 flex flex-col items-center gap-2 pointer-events-none">
        {isReconnecting && (
          <div className="bg-amber-500/95 text-white text-xs font-semibold px-4 py-2 rounded-full pointer-events-auto">
            Reconnecting…
          </div>
        )}
        {!isReconnecting && quality === ConnectionQuality.Poor && (
          <div className="bg-rose-500/95 text-white text-xs font-semibold px-4 py-2 rounded-full pointer-events-auto">
            Weak connection — audio is being prioritised
          </div>
        )}
        {suggestVoiceOnly && videoOn && callInfo.type === "video" && (
          <button
            onClick={async () => {
              const room = roomRef.current;
              if (!room) return;
              await room.localParticipant.setCameraEnabled(false);
              setVideoOn(false);
              setSuggestVoiceOnly(false);
            }}
            className="bg-white text-slate-900 text-xs font-semibold px-4 py-2 rounded-full pointer-events-auto hover:bg-slate-100 transition-colors"
          >
            Turn off video to improve audio
          </button>
        )}
        {audioBlocked && (
          <div className="bg-amber-500/90 text-white text-xs font-semibold px-4 py-2 rounded-full pointer-events-auto">
            Click anywhere to enable audio
          </div>
        )}
      </div>

      {/* Video area */}
      <div ref={stageRef} className="flex-1 relative overflow-hidden">
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
                  {remoteLeft
                    ? `${callInfo.participantName || "They"} left the call`
                    : `Waiting for ${callInfo.participantName || "participant"} to join`}
                </p>
                {remoteLeft && !closeWhenAlone && (
                  <p className="mt-1 text-xs text-white/70">
                    You&apos;re still in the room — they can rejoin at any time.
                  </p>
                )}
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
          <div
            ref={selfViewRef}
            onPointerDown={startDragSelfView}
            style={selfViewStyle}
            className={`absolute z-20 touch-none overflow-hidden rounded-lg border border-white/10 bg-slate-800 shadow-lg ${
              draggingSelf ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {/*
              object-contain, not object-cover: the tile takes the camera's own
              aspect ratio (see onLoadedMetadata below), so a landscape camera
              gets a landscape tile and a portrait one a portrait tile. The
              previous fixed 2:3 box with object-cover cropped the sides off
              every landscape feed and zoomed in on the middle.
            */}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) {
                  setSelfAspect(v.videoWidth / v.videoHeight);
                }
              }}
              className="h-full w-full object-contain"
            />
            <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-bold text-white">
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
