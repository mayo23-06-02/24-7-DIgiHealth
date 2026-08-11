"use client";

import React from "react";
import { Check } from "lucide-react";

interface BookingStepIndicatorProps {
  step: number;
  totalSteps: number;
  /** One label per step, e.g. ["Choose Doctor", "Date & Time", "Reason", "Confirm"]. */
  labels?: string[];
}

export default function BookingStepIndicator({
  step,
  totalSteps,
  labels,
}: BookingStepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="mb-2">
      <div className="flex items-start">
        {steps.map((s, idx) => {
          const isDone = step > s;
          const isCurrent = step === s;
          const label = labels?.[idx];
          const status = isDone ? "Completed" : isCurrent ? "In progress" : "Not yet";

          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-2 shrink-0 w-16">
                <div
                  className={`relative flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-all duration-base ${
                    isDone
                      ? "bg-success-500 text-white"
                      : isCurrent
                        ? "bg-primary text-white ring-4 ring-primary/15"
                        : "bg-surface-soft text-ink-400 border border-border"
                  }`}
                >
                  {isDone ? (
                    <Check size={13} strokeWidth={3} />
                  ) : (
                    <span className="text-[11px] font-bold">{s}</span>
                  )}
                </div>
                {label && (
                  <div className="text-center">
                    <p
                      className={`text-[11px] font-bold leading-tight ${
                        isCurrent ? "text-ink-900" : isDone ? "text-success-700" : "text-ink-400"
                      }`}
                    >
                      {label}
                    </p>
                    <p className="text-[10px] text-ink-400 font-medium mt-0.5">
                      {status}
                    </p>
                  </div>
                )}
              </div>
              {idx < totalSteps - 1 && (
                <div className="flex-1 h-0.5 mt-3 rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-success-500 transition-all duration-slow ${
                      isDone ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
