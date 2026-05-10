import React from "react";
import { BiX } from "react-icons/bi";
import VideoCallMockup from "./VideoCallMockup";

export default function CallModal({
  roomUrl,
  token,
  type = "video",
  onClose,
}: {
  roomUrl: string;
  token?: string;
  type?: string;
  onClose: () => void;
}) {
  // If type is voice, we might want a different mockup, but the request specifically asked for video call mockup.
  if (type === "video") {
    return <VideoCallMockup onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-[999] p-4 md:p-8 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 rounded-3xl  flex flex-col border border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-slate-800 shadow-none z-10 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full animate-pulse bg-emerald-500" />
            <span className="text-white font-bold  tracking-normal text-xs">
              Live Secure Voice Call
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all focus:outline-none"
          >
            <BiX size={24} />
          </button>
        </div>
        <div className="p-12 flex flex-col items-center justify-center space-y-6">
          <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary/40">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-4xl animate-pulse">
              📞
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-white text-xl font-bold font-grotesk">
              Voice Consultation
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Connecting to secure clinical channel...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
