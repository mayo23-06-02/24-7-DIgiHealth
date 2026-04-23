"use client";

import React, { useState } from "react";
import {
  BiMicrophone,
  BiMicrophoneOff,
  BiVideo,
  BiVideoOff,
  BiPhoneOff,
  BiLinkAlt,
  BiUserPlus,
  BiDotsVerticalRounded,
  BiChat,
  BiExpand,
} from "react-icons/bi";
import Avatar from "@/components/ui/Avatar";

export default function VideoCallMockup({
  onClose,
  participantName = "Dr. Sarah Mitchell",
  participantAvatar = "https://i.pravatar.cc/300?u=sarah",
}: {
  onClose: () => void;
  participantName?: string;
  participantAvatar?: string;
}) {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [swapped, setSwapped] = useState(false);

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col animate-in fade-in zoom-in duration-300">
      {/* Header Info */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm tracking-tight font-grotesk">
              Active Clinical Session
            </h3>
            <p className="text-emerald-400 text-xs font-bold  tracking-normal">
              End-to-End Encrypted
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <span className="text-white text-xs font-bold tabular-nums">
              12:45
            </span>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* THE MAIN VIEW (Full Screen Background) */}
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center overflow-hidden">
          {swapped ? (
            // Patient is Main
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              {videoOn ? (
                <div className="w-full h-full bg-gradient-to-tr from-slate-900 to-slate-700 flex items-center justify-center">
                  <div className="text-white/10 flex flex-col items-center">
                    <BiVideo size={120} />
                    <span className="text-xs font-bold mt-4  tracking-normal">
                      Self View (Full)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-slate-700 text-9xl font-bold">?</div>
              )}
            </div>
          ) : (
            // Doctor is Main
            <div className="w-full h-full">
              <img
                src={participantAvatar}
                alt={participantName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30" />
            </div>
          )}

          {/* Full Screen Content Label */}
          <div className="absolute bottom-32 left-8 z-30">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-none">
              {!swapped ? (
                <>
                  <Avatar
                    size="sm"
                    src={participantAvatar}
                    name={participantName}
                  />
                  <div>
                    <h4 className="text-white font-bold text-sm font-grotesk">
                      {participantName}
                    </h4>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-400 font-bold  tracking-normal">
                        Practitioner
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 px-2">
                  <BiVideo className="text-white" size={20} />
                  <span className="text-white font-bold text-sm tracking-tight text-white/90">
                    Your Camera Feed
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* THE MINI VIEW (Floating Overlay) */}
        <div
          onClick={() => setSwapped(!swapped)}
          className="
            absolute top-28 right-8 w-40 h-56 md:w-56 md:h-72 rounded-3xl shadow-none border-2 border-white/20 z-40 
            overflow-hidden cursor-pointer hover:scale-105 hover:border-primary transition-all duration-500 group
          "
        >
          {swapped ? (
            // Doctor is Mini
            <div className="w-full h-full relative">
              <img
                src={participantAvatar}
                alt={participantName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all" />
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <span className="text-xs text-white font-bold  tracking-normal drop-shadow-none">
                  {participantName}
                </span>
              </div>
            </div>
          ) : (
            // Patient is Mini
            <div className="w-full h-full bg-slate-800 flex items-center justify-center relative">
              {videoOn ? (
                <div className="w-full h-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center">
                  <BiVideo size={32} className="text-white/20" />
                </div>
              ) : (
                <div className="text-slate-600 font-bold text-4xl">?</div>
              )}
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <span className="text-xs text-white font-bold  tracking-normal drop-shadow-none">
                  You
                </span>
              </div>
            </div>
          )}

          {/* Interchange Indicator */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-primary/20 backdrop-blur-[2px]">
            <div className="bg-white text-primary p-2 rounded-full shadow-none">
              <BiExpand size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Interaction Controls */}
      <div className="p-8 bg-slate-900 border-t border-white/5 flex flex-col items-center gap-6 z-50">
        <div className="flex items-center gap-4 md:gap-8">
          <button
            onClick={() => setMicOn(!micOn)}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-none ${micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white hover:bg-rose-600"}`}
          >
            {micOn ? <BiMicrophone size={24} /> : <BiMicrophoneOff size={24} />}
          </button>

          <button
            onClick={() => setVideoOn(!videoOn)}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-none ${videoOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white hover:bg-rose-600"}`}
          >
            {videoOn ? <BiVideo size={24} /> : <BiVideoOff size={24} />}
          </button>

          <button
            onClick={onClose}
            className="w-20 h-14 bg-rose-600 text-white rounded-3xl flex items-center justify-center hover:bg-rose-700 transition-all shadow-none shadow-rose-900/20"
          >
            <BiPhoneOff size={28} />
          </button>

          <button
            onClick={() => setSwapped(!swapped)}
            className="w-14 h-14 rounded-2xl bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all shadow-none"
            title="Swap View"
          >
            <BiExpand size={24} className={swapped ? "rotate-90" : ""} />
          </button>

          <button className="w-14 h-14 rounded-2xl bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all shadow-none">
            <BiChat size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
