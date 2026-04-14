"use client";
import React from "react";
import { FiPhoneCall, FiMapPin } from "react-icons/fi";

export default function EmergencyBanner() {
  return (
    <div className="bg-high-vis-red text-white p-4 md:p-6 shadow-md border-b-[4px] border-red-900/30 w-full relative z-40">
      <div className="container mx-auto max-w-[1600px] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl animate-pulse">
            ⚠️
          </div>
          <div>
            <h4 className="font-bold text-lg">Life‑threatening emergency?</h4>
            <p className="text-white/90">
              Please do not wait. Use the emergency resources immediately.
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-6 py-3 bg-white text-high-vis-red rounded-full font-bold shadow-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
            <FiPhoneCall /> Call 10111
          </button>
          <button className="flex-1 md:flex-none px-6 py-3 bg-red-900/40 border border-white/20 text-white rounded-full font-bold shadow-sm hover:bg-red-900/60 transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
            <FiMapPin /> Find ER
          </button>
        </div>
      </div>
    </div>
  );
}
