"use client";
import React from "react";
import { BiPhoneCall, BiX } from "react-icons/bi";
import { useCall } from "../context/CallContext";

export default function CallNotification() {
  const { incomingCall, acceptCall, declineCall } = useCall();

  if (!incomingCall) return null;

  const handleAccept = () => {
    acceptCall(incomingCall);
  };

  const handleDecline = () => {
    declineCall(incomingCall.callId);
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-in slide-in-from-right-8 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
          <BiPhoneCall size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold tracking-wider text-rose-500 uppercase">
            Incoming {incomingCall.type} call
          </p>
          <p className="truncate text-sm font-semibold text-slate-800">
            {incomingCall.participantName || "Participant"} is calling
          </p>
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
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          Join now
        </button>
      </div>
    </div>
  );
}
