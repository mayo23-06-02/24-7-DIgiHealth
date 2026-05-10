"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  BiMicrophone,
  BiMicrophoneOff,
  BiPhoneCall,
  BiVolumeFull,
  BiVolumeMute,
  BiVolumeLow,
  BiCheckShield,
  BiPlus,
  BiUser,
  BiDotsVerticalRounded,
  BiX,
} from "react-icons/bi";
import Button from "@/components/ui/Button";

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomUrl: string;
  practitionerName: string;
  practitionerAvatar?: string;
}

export default function VoiceCallModal({
  isOpen,
  onClose,
  roomUrl,
  practitionerName,
  practitionerAvatar,
}: VoiceCallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      intervalRef.current = setInterval(
        () => setCallDuration((prev) => prev + 1),
        1000,
      );
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setCallDuration(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-600 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="relative bg-white w-full max-w-lg rounded-[48px] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-500">
        {/* DAILY.CO INTEGRATION (HIDDEN AUDIO) */}
        {roomUrl && (
          <iframe
            src={roomUrl}
            className="hidden" // Audio only, we hide the video element
            allow="camera; microphone"
          />
        )}

        {/* TOP STATUS BAR */}
        <div className="p-8 pb-0 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 shadow-none">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800  tracking-normal">
              Ongoing Consultation
            </span>
          </div>
          <div className="flex items-center gap-2 text-emerald-500 font-extrabold text-xs  tracking-normal">
            <BiCheckShield size={16} /> Encrypted
          </div>
        </div>

        <div className="p-10 pt-16 text-center space-y-12">
          {/* SPECIALIST PROFILE CIRCLE */}
          <div className="relative inline-block mx-auto">
            <div className="w-40 h-40 rounded-full bg-slate-50 border-8 border-white  p-2 relative overflow-hidden group transition-transform duration-700 hover:scale-105">
              <img
                src={
                  practitionerAvatar ||
                  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300"
                }
                alt={practitionerName}
                className="w-full h-full object-cover rounded-full grayscale-[0.2]"
              />
              <div className="absolute inset-0 bg-primary/5 animate-pulse" />
            </div>
            {/* Pulsing Outer Ring */}
            <div className="absolute -inset-4 bg-primary/10 rounded-full -z-10 animate-ping opacity-30" />
            <div className="absolute -inset-8 bg-primary/5 rounded-full -z-20 animate-ping opacity-20 duration-3000" />
          </div>

          <div className="space-y-3">
            <h3 className="text-3xl font-bold text-slate-800 tracking-tighter shadow-none font-grotesk">
              Dr. {practitionerName}
            </h3>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-bold text-primary  tracking-normal">
                Senior Practitioner
              </span>
              <span className="text-slate-200">|</span>
              <span className="text-xs font-bold text-slate-400">
                Cardiology Hub
              </span>
            </div>
          </div>

          {/* TIMER */}
          <div className="text-5xl font-bold text-slate-800 tracking-tighter tabular-nums bg-slate-50 py-8 rounded-[40px] border border-slate-100 shadow-inner group">
            <p className="text-xs font-bold text-slate-300  tracking-[0.4em] mb-4 group-hover:text-primary transition-colors">
              Call Duration
            </p>
            {formatTime(callDuration)}
          </div>

          {/* CALL CONTROLS */}
          <div className="flex flex-col gap-10 pt-4">
            <div className="flex justify-center items-center gap-6">
              <Button
                variant="ghost"
                onClick={() => setIsMuted(!isMuted)}
                className={`w-20 h-20 p-0 rounded-[32px] flex items-center justify-center text-3xl  transition-all active:scale-90 group !min-w-0 ${isMuted ? "bg-rose-500 text-white shadow-rose-500/40 animate-in zoom-in-90" : "bg-slate-50 text-slate-400 hover:text-primary hover:bg-white border border-slate-100"}`}
              >
                {isMuted ? <BiMicrophoneOff /> : <BiMicrophone />}
              </Button>

              <Button
                variant="secondary"
                onClick={onClose}
                className="w-24 h-24 p-0 rounded-[36px] bg-rose-500 text-white flex items-center justify-center text-5xl  shadow-rose-500/40 hover:bg-rose-600 transition-all active:scale-95 group !min-w-0 border-none"
              >
                <BiPhoneCall className="group-hover:rotate-135 transition-transform duration-500" />
              </Button>

              <Button
                variant="ghost"
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`w-20 h-20 p-0 rounded-[32px] flex items-center justify-center text-3xl  transition-all active:scale-90 !min-w-0 ${isSpeakerOn ? "bg-primary text-white shadow-primary/40" : "bg-slate-50 text-slate-400 hover:text-primary hover:bg-white border border-slate-100"}`}
              >
                {isSpeakerOn ? <BiVolumeFull /> : <BiVolumeMute />}
              </Button>
            </div>

            {/* ACTION LINKS */}
            <div className="flex justify-center gap-6 border-t border-slate-50 pt-8 pb-4">
              <Button
                variant="ghost"
                className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-slate-50 transition-all active:scale-95 !h-auto !min-w-0 border-none bg-transparent"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <BiPlus />
                </div>
                <span className="text-[9px] font-bold text-slate-400  tracking-normal group-hover:text-primary transition-colors">
                  Add Person
                </span>
              </Button>
              <Button
                variant="ghost"
                className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-slate-50 transition-all active:scale-95 !h-auto !min-w-0 border-none bg-transparent"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <BiUser />
                </div>
                <span className="text-[9px] font-bold text-slate-400  tracking-normal group-hover:text-primary transition-colors">
                  Patient Info
                </span>
              </Button>
              <Button
                variant="ghost"
                className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-slate-50 transition-all active:scale-95 !h-auto !min-w-0 border-none bg-transparent"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <BiDotsVerticalRounded size={20} />
                </div>
                <span className="text-[9px] font-bold text-slate-400  tracking-normal group-hover:text-primary transition-colors">
                  Actions
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* BOTTOM DRAG INDICATOR (Mobile Hint) */}
        <div className="pb-6 flex flex-col items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          <p className="text-[9px] font-bold text-slate-200  tracking-[0.4em]">
            End Session to Record Notes
          </p>
        </div>
      </div>
    </div>
  );
}
