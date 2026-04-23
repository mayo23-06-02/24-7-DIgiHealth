"use client";
import React from "react";
import { FiPhoneCall, FiMapPin } from "react-icons/fi";
import Button from "../ui/Button";

export default function EmergencyBanner() {
  return (
    <div className="bg-high-vis-red text-white p-4 md:p-6 shadow-md border-b-[4px] border-red-900/30 w-full relative z-40">
      <div className="container mx-auto max-w-[1600px] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl animate-pulse">
            ⚠️
          </div>
          <div>
            <h4 className="font-bold text-lg font-grotesk">Life‑threatening emergency?</h4>
            <p className="text-white/90">
              Please do not wait. Use the emergency resources immediately.
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <Button
            variant="white"
            onClick={() => (window.location.href = "tel:10111")}
            className="flex-1 md:flex-none px-6 py-4 rounded-full font-bold shadow-none flex items-center justify-center gap-2 whitespace-nowrap text-red-600 h-auto"
          >
            <FiPhoneCall /> Call 10111
          </Button>
          <Button
            variant="ghost"
            onClick={() => {}}
            className="flex-1 md:flex-none px-6 py-4 bg-red-900/40 border border-white/20 text-white rounded-full font-bold shadow-none hover:bg-red-900/60 transition-colors flex items-center justify-center gap-2 whitespace-nowrap h-auto"
          >
            <FiMapPin /> Find ER
          </Button>
        </div>
      </div>
    </div>
  );
}
