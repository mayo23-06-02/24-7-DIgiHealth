"use client";

import React from "react";
import { BiCheck } from "react-icons/bi";

interface BookingStepIndicatorProps {
  step: number;
  totalSteps: number;
}

export default function BookingStepIndicator({
  step,
  totalSteps,
}: BookingStepIndicatorProps) {
  const stepsArray = Array.from({ length: totalSteps }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      {stepsArray.map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === s
                ? "bg-primary text-white"
                : step > s
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            {step > s ? <BiCheck size={16} /> : s}
          </div>
          {s < totalSteps && (
            <div
              className={`w-12 h-0.5 ${step > s ? "bg-emerald-500" : "bg-slate-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
