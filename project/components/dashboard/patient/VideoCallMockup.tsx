"use client";
import React, { useState } from "react";
import Button from "@/components/ui/Button";
import {
  BiVideo,
  BiVideoOff,
  BiMicrophone,
  BiMicrophoneOff,
  BiPhoneOff,
  BiMessageRounded,
  BiExpand,
  BiX,
  BiUser,
  BiColumns,
  BiWindows,
} from "react-icons/bi";

interface VideoCallMockupProps {
  doctorName: string;
  doctorAvatar?: string;
  onClose: () => void;
}

export default function VideoCallMockup({
  doctorName,
  doctorAvatar,
  onClose,
}: VideoCallMockupProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [layout, setLayout] = useState<"side-by-side" | "overlay">("overlay");

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-6 z-50 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 backdrop-blur-xl border border-white/10 flex items-center justify-center overflow-hidden">
            <BiVideo className="text-primary text-2xl" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-none tracking-tight font-grotesk">
              Secure Clinical Consultation
            </h2>
            <p className="text-emerald-400 text-xs font-bold  tracking-normal mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Encrypted Connection Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              setLayout(layout === "overlay" ? "side-by-side" : "overlay")
            }
            className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/5 flex items-center justify-center text-white hover:bg-white/20 transition-all hidden md:flex"
            title="Switch Layout"
          >
            {layout === "overlay" ? (
              <BiColumns size={22} />
            ) : (
              <BiWindows size={22} />
            )}
          </button>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-rose-500/20 backdrop-blur-xl border border-rose-500/30 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
          >
            <BiX size={28} />
          </button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 flex flex-col md:flex-row p-6 pt-24 gap-4 relative">
        {/* Layout Logic */}
        {layout === "overlay" ? (
          <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900 border border-white/5 ">
            {/* Main Participant (Doctor) */}
            <div className="absolute inset-0">
              {doctorAvatar && !isVideoOff ? (
                <img
                  src={doctorAvatar}
                  alt={doctorName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
                  <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <BiUser className="text-6xl text-primary" />
                  </div>
                  <p className="text-white font-bold text-xl">{doctorName}</p>
                  <p className="text-slate-400 text-sm mt-2">Connecting...</p>
                </div>
              )}
              {/* Doctor Identity Tag */}
              <div className="absolute bottom-10 left-10 py-3 px-6 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10">
                <p className="text-white font-bold text-sm">{doctorName}</p>
                <p className="text-primary text-[9px] font-bold  tracking-normal mt-1">
                  Specialist Practitioner
                </p>
              </div>
            </div>

            {/* Small Overlay (Patient - You) */}
            <div className="absolute top-10 right-10 w-48 h-64 md:w-64 md:h-80 rounded-3xl overflow-hidden bg-slate-800 border-2 border-white/20  z-40">
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <BiUser size={48} />
                <p className="text-xs font-bold  mt-2 tracking-normal">You</p>
              </div>
              <div className="absolute bottom-4 left-4 flex gap-2">
                <div className="w-8 h-8 rounded-lg bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                  {isMuted ? (
                    <BiMicrophoneOff size={16} />
                  ) : (
                    <BiMicrophone size={16} />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row gap-4 w-full h-full">
            {/* Split View 1 (Doctor) */}
            <div className="flex-1 rounded-lg overflow-hidden bg-slate-900 border border-white/5 relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <BiUser className="text-4xl text-primary" />
                </div>
                <p className="text-white font-bold text-lg">{doctorName}</p>
              </div>
              <div className="absolute bottom-8 left-8 py-2 px-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
                <p className="text-white font-bold text-xs">{doctorName}</p>
              </div>
            </div>
            {/* Split View 2 (Patient) */}
            <div className="flex-1 rounded-lg overflow-hidden bg-slate-800 border border-white/5 relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/50">
                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <BiUser className="text-4xl text-slate-400" />
                </div>
                <p className="text-slate-400 font-bold">You</p>
              </div>
              <div className="absolute bottom-8 left-8 py-2 px-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white">
                {isMuted && <BiMicrophoneOff size={14} />}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-10 flex justify-center items-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border-2 ${
            isMuted
              ? "bg-rose-500 border-rose-500 text-white"
              : "bg-white/10 border-white/20 text-white hover:bg-white/20"
          }`}
        >
          {isMuted ? <BiMicrophoneOff size={28} /> : <BiMicrophone size={28} />}
        </button>

        <button
          onClick={() => setIsVideoOff(!isVideoOff)}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border-2 ${
            isVideoOff
              ? "bg-rose-500 border-rose-500 text-white"
              : "bg-white/10 border-white/20 text-white hover:bg-white/20"
          }`}
        >
          {isVideoOff ? <BiVideoOff size={28} /> : <BiVideo size={28} />}
        </button>

        <button
          onClick={onClose}
          className="w-20 h-20 rounded-[2rem] bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center  shadow-rose-900/40 hover:scale-110 active:scale-95 transition-all mx-4 rotate-0"
        >
          <BiPhoneOff size={32} />
        </button>

        <button className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 text-white flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all">
          <BiMessageRounded size={28} />
        </button>

        <button className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 text-white flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all">
          <BiExpand size={28} />
        </button>
      </div>
    </div>
  );
}
