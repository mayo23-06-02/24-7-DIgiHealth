"use client";
import React, { useEffect, useRef } from "react";
import { BiPhoneCall, BiX, BiVolumeMute, BiVolumeFull } from "react-icons/bi";
import { useCall } from "../context/CallContext";

export default function CallNotification() {
  const { incomingCall, acceptCall, declineCall } = useCall();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);

  // Create and manage audio
  useEffect(() => {
    // Only create audio if we have an incoming call
    if (incomingCall) {
      // If audio doesn't exist, create it
      if (!audioRef.current) {
        // You can replace this with your own sound file
        // Place a ringtone.mp3 in your public/sounds/ folder
        audioRef.current = new Audio("ringtone.m4a");
        audioRef.current.loop = true;
        audioRef.current.volume = 0.9;
      }

      // Try to play with user gesture fallback
      const playAudio = () => {
        if (audioRef.current && !isMuted) {
          audioRef.current.play().catch((err) => {
            // Auto-play was prevented; we'll try again on user click
            console.warn("Ringtone autoplay blocked:", err);
          });
        }
      };

      // Play immediately
      playAudio();

      // Also play on any user interaction (click anywhere) if blocked
      const handleUserInteraction = () => {
        if (audioRef.current && !isMuted && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        }
        document.removeEventListener("click", handleUserInteraction);
      };
      document.addEventListener("click", handleUserInteraction);

      return () => {
        document.removeEventListener("click", handleUserInteraction);
      };
    } else {
      // No incoming call: stop and clean up audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        // Optionally, you can keep the audio instance for next call
      }
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
        // Unmute: try to play
        audioRef.current.play().catch(() => {});
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
