"use client";

import React from "react";

export default function AboutUs() {
  return (
    <section id="about" className="bg-white py-16 md:py-20">
      <div className="container mx-auto px-4 md:px-8 xl:px-12 md:max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[1920px]">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-6 items-stretch">
          {/* Consultations this month */}
          <div className="bg-surface-soft rounded-lg p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-ink-500">Consultations Completed</p>
              <span className="text-xs font-bold text-success-700 bg-success-50 px-2 py-1 rounded-full">
                This month
              </span>
            </div>
            <p className="text-4xl font-bold text-ink-900 font-grotesk mb-3">632</p>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "78%" }} />
            </div>
          </div>

          {/* Specialists online */}
          <div className="bg-surface-soft rounded-lg p-6 flex flex-col justify-between">
            <p className="text-sm font-bold text-ink-500 mb-4">Specialists Online Now</p>
            <div className="flex items-center gap-1 mb-3">
              {["ZN", "ML", "NK", "SZ"].map((initials, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center border-2 border-white -ml-2 first:ml-0"
                >
                  {initials}
                </div>
              ))}
              <div className="w-10 h-10 rounded-full bg-slate-200 text-ink-600 text-xs font-bold flex items-center justify-center border-2 border-white -ml-2">
                +16
              </div>
            </div>
            <p className="text-sm text-ink-500">
              <span className="font-bold text-ink-900">20 doctors</span> ready to
              see you right now
            </p>
          </div>

          {/* Wellness score gauge */}
          <div className="bg-ink-900 rounded-lg p-6 flex items-center gap-5 md:w-[260px]">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="var(--color-success-500, #10b981)"
                  strokeWidth="3"
                  strokeDasharray="97 100"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg font-grotesk">
                97%
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-sm mb-1">Wellness Score</p>
              <p className="text-white/60 text-xs leading-relaxed">
                Your personalized health snapshot, updated after every visit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
