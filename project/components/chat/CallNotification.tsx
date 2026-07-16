"use client";
import React, { useEffect, useRef, useState } from "react";
import { BiPhoneCall, BiX, BiVolumeMute, BiVolumeFull } from "react-icons/bi";
import { useCall } from "../context/CallContext";

export default function CallNotification() {
  const { incomingCall, acceptCall, declineCall } = useCall();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  // Preload audio on component mount for all browsers/OS
  useEffect(() => {
    if (audioRef.current) return;

    // Create audio element with preloading
    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = true;
    audio.volume = 0.9;
    audioRef.current = audio;

    // Absolute (site-root) paths so they resolve correctly from any route —
    // a relative path like "ringtone.mp3" 404s on any page not served at "/".
    // Ordered by what actually exists in /public first, with extra formats
    // as future-proofing for browsers that reject the primary format.
    const audioSources = [
      "/ringtone.m4a",
      "/notification.m4a",
      "/ringtone.mp3",
      "/ringtone.ogg",
      "/notification.mp3",
    ];

    let sourceIndex = 0;

    // Real fallback chain: on load failure, advance to the next candidate
    // instead of silently giving up after the first (previously untested) source.
    const tryNextSource = () => {
      if (sourceIndex >= audioSources.length) {
        console.error("[CallNotification] No playable ringtone source found");
        setAudioReady(false);
        return;
      }
      const src = audioSources[sourceIndex];
      sourceIndex += 1;
      audio.src = src;
      audio.load();
    };

    const handleCanPlay = () => {
      setAudioReady(true);
      console.log(`[CallNotification] Ringtone ready: ${audio.currentSrc || audio.src}`);
    };

    const handleError = () => {
      console.warn(`[CallNotification] Failed to load ${audio.src}, trying next source`);
      tryNextSource();
    };

    audio.addEventListener("canplaythrough", handleCanPlay);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    tryNextSource();

    return () => {
      audio.removeEventListener("canplaythrough", handleCanPlay);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  // Play/pause audio based on incoming call state
  useEffect(() => {
    if (!audioRef.current) return;

    if (incomingCall && !isMuted) {
      // Try to play the audio
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("[CallNotification] Ringtone playing successfully");
          })
          .catch((err) => {
            console.warn("[CallNotification] Ringtone autoplay blocked:", err);
            // Try to unlock audio on next user interaction
            const unlockAudio = () => {
              if (audioRef.current && incomingCall && !isMuted && audioRef.current.paused) {
                audioRef.current.play().catch(() => {});
              }
              document.removeEventListener("click", unlockAudio);
              document.removeEventListener("touchstart", unlockAudio);
              document.removeEventListener("keydown", unlockAudio);
            };
            document.addEventListener("click", unlockAudio, { once: true });
            document.addEventListener("touchstart", unlockAudio, { once: true });
            document.addEventListener("keydown", unlockAudio, { once: true });
          });
      }
    } else {
      // Stop audio when no incoming call or muted
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [incomingCall, isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      if (isMuted) {
        // Unmute: try to play if there's an incoming call
        if (incomingCall) {
          audioRef.current.play().catch(() => {});
        }
      } else {
        // Mute: pause
        audioRef.current.pause();
      }
    }
  };

  if (!incomingCall) return null;

  const handleAccept = () => {
    // Stop ringtone before accepting
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    acceptCall(incomingCall);
  };

  const handleDecline = () => {
    // Stop ringtone before declining
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    declineCall(incomingCall.callId);
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-80 bg-white rounded-lg shadow-2xl border border-slate-200 p-4 animate-in slide-in-from-right-8 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-100 text-rose-600 shrink-0 animate-pulse">
          <BiPhoneCall size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold tracking-wider text-rose-500 uppercase">
            Incoming {incomingCall.type} call
          </p>
          <p className="truncate text-sm font-semibold text-slate-800">
            {incomingCall.participantName || "Participant"} is calling
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-slate-400 animate-pulse">
              ● Ringing...
            </span>
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title={isMuted ? "Unmute ringtone" : "Mute ringtone"}
            >
              {isMuted ? (
                <BiVolumeMute size={14} />
              ) : (
                <BiVolumeFull size={14} />
              )}
            </button>
          </div>
        </div>
        <button
          onClick={handleDecline}
          className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          <BiX size={18} />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleDecline}
          className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          Join now
        </button>
      </div>
    </div>
  );
}
