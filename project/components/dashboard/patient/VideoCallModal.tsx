"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  BiMicrophone,
  BiMicrophoneOff,
  BiVideo,
  BiVideoOff,
  BiPhoneCall,
  BiFullscreen,
  BiExitFullscreen,
  BiMessageDetail,
  BiUserVoice,
  BiVolumeFull,
  BiVolumeMute,
  BiPlus,
  BiShieldQuarter,
  BiX,
  BiExpand,
  BiExpandAlt,
} from "react-icons/bi";
import Button from "@/components/ui/Button";

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomUrl: string;
  practitionerName: string;
  practitionerAvatar?: string;
  specialisation?: string;
}

export default function VideoCallModal({
  isOpen,
  onClose,
  roomUrl,
  practitionerName,
  practitionerAvatar,
  specialisation = "Senior Medical Officer",
}: VideoCallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-700 bg-slate-900 flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-700">
      {/* MAIN VIDEO AREA (DAILY.CO IFRAME) */}
      <div className="relative flex-1 bg-slate-900 flex flex-col">
        {/* The Actual Video Iframe */}
        <iframe
          ref={iframeRef}
          src={roomUrl}
          className="w-full h-full border-none"
          allow="camera; microphone; fullscreen; display-capture"
        />

        {/* OVERLAYS ON TOP OF DAILY IFRAME */}

        {/* Top Indicators Overlay */}
        <div className="absolute top-8 left-8 right-8 z-10 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-3xl px-5 py-3 rounded-full border border-white/10  shadow-slate-900/50 pointer-events-auto">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary-light border border-primary/20">
                  <BiShieldQuarter size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-white/50  tracking-normal block leading-none mb-1">
                    Encrypted Room
                  </span>
                  <span className="text-white text-xs font-bold tracking-tighter block leading-none">
                    247DH-VCC-9941
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-3xl px-5 py-3 rounded-full border border-white/10  shadow-slate-900/50 pointer-events-auto">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-white text-xs font-bold  tracking-normal tabular-nums">
                {formatTime(callDuration)} Live
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-3xl p-2 rounded-[32px] border border-white/10  shadow-slate-900/50 pointer-events-auto">
            <div className="flex items-center gap-4 pl-4 pr-2">
              <div className="text-right">
                <h4 className="text-white text-sm font-bold tracking-tight leading-none mb-1 font-grotesk">
                  Dr. {practitionerName}
                </h4>
                <p className="text-primary-light text-[9px] font-bold  tracking-normal leading-none">
                  {specialisation}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/5 overflow-hidden ring-2 ring-white/10 shadow-none">
                <img
                  src={
                    practitionerAvatar ||
                    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200"
                  }
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
            </div>
          </div>
        </div>

        {/* Floating Patient Self-View Simulation (PiP) */}
        {!isVideoOff && (
          <div className="absolute top-32 right-8 w-44 h-60 rounded-[32px] overflow-hidden border-4 border-slate-900 shadow-3xl z-20 group transition-all hover:scale-[1.02] cursor-pointer">
            <img
              src="https://images.unsplash.com/photo-1531123897727-8f129e16fd3c?auto=format&fit=crop&q=80&w=400"
              className="w-full h-full object-cover"
              alt="Patient Selfie"
            />
            <div className="absolute inset-0 bg-slate-900/10" />
            <div className="absolute bottom-4 left-4 right-4 flex justify-center">
              <div className="px-3 py-1 bg-white/10 backdrop-blur-xl rounded-full text-xs font-bold text-white  tracking-normal border border-white/10">
                You (Verified)
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM FLOATING CONTROLS (TRENCH STYLE) */}
        <div className="absolute bottom-10 left-0 right-0 z-30 flex justify-center pointer-events-none px-10">
          <div className="bg-slate-900/60 backdrop-blur-4xl px-8 py-5 rounded-[44px] border border-white/10 shadow-3xl shadow-slate-900/80 flex items-center gap-6 pointer-events-auto transition-transform hover:scale-[1.02]">
            <div className="flex gap-4 border-r border-white/10 pr-6 mr-2">
              <Button
                variant="ghost"
                onClick={() => setIsMuted(!isMuted)}
                className={`w-14 h-14 p-0 rounded-[22px] flex items-center justify-center transition-all active:scale-90 !min-w-0 ${isMuted ? "bg-rose-500 text-white shadow-none shadow-rose-500/30 animate-in zoom-in-95" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"}`}
              >
                {isMuted ? (
                  <BiMicrophoneOff size={24} />
                ) : (
                  <BiMicrophone size={24} />
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`w-14 h-14 p-0 rounded-[22px] flex items-center justify-center transition-all active:scale-90 !min-w-0 ${isVideoOff ? "bg-rose-500 text-white shadow-none shadow-rose-500/30 animate-in zoom-in-95" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"}`}
              >
                {isVideoOff ? <BiVideoOff size={24} /> : <BiVideo size={24} />}
              </Button>
            </div>

            <div className="flex gap-4">
              <Button
                variant="ghost"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`w-14 h-14 p-0 rounded-[22px] flex items-center justify-center transition-all active:scale-90 shadow-none !min-w-0 ${isSidebarOpen ? "bg-primary text-white shadow-primary/30" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"}`}
              >
                <BiMessageDetail size={24} />
              </Button>
              <Button
                variant="ghost"
                onClick={toggleFullscreen}
                className="w-14 h-14 p-0 rounded-[22px] bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all active:scale-90 shadow-none !min-w-0"
              >
                {isFullscreen ? (
                  <BiExitFullscreen size={24} />
                ) : (
                  <BiFullscreen size={24} />
                )}
              </Button>
            </div>

            <Button
              variant="white"
              onClick={onClose}
              className="ml-4 w-28 h-18 bg-rose-500 hover:bg-rose-600 text-white rounded-[28px] flex items-center justify-center  shadow-rose-500/50 transition-all active:scale-95 group !min-w-0 !p-0"
            >
              <BiPhoneCall
                size={34}
                className="group-hover:rotate-12 transition-transform duration-500"
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
