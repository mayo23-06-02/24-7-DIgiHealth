"use client";

import React from "react";
import {
  BiCheckCircle,
  BiShieldQuarter,
  BiUser,
  BiFile,
  BiBell,
  BiSupport,
  BiLockAlt,
  BiEnvelope,
  BiPhone,
  BiBadgeCheck,
} from "react-icons/bi";
import Button from "@/components/ui/Button";

interface HealthItem {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

interface ProfileSidebarProps {
  setToast: (toast: {
    message: string;
    type: "success" | "error" | "info";
  } | null) => void;
  completeness: number;
  healthItems: HealthItem[];
  accountFacts: { label: string; value: string; icon?: React.ReactNode }[];
  tips?: string[];
}

export default function ProfileSidebar({
  setToast,
  completeness,
  healthItems,
  accountFacts,
  tips = [],
}: ProfileSidebarProps) {
  return (
    <aside className="xl:col-span-4 space-y-5">
      {/* Completeness */}
      <div className="rounded-lg border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40 overflow-hidden sticky top-20">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Profile health
              </p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                Verification progress
              </p>
            </div>
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={
                    completeness >= 80
                      ? "#16a34a"
                      : completeness >= 50
                        ? "#4493b8"
                        : "#ea580c"
                  }
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(completeness / 100) * 94.2} 94.2`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800 tabular-nums">
                {completeness}%
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {healthItems.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <span className="text-slate-400">{item.icon}</span>
                  {item.label}
                </span>
                <span className="text-sm font-bold text-slate-800 tabular-nums">
                  {item.value}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${item.color}`}
                  style={{ width: `${Math.min(100, item.value)}%` }}
                />
              </div>
            </div>
          ))}

          <div
            className={`flex items-start gap-3 p-3.5 rounded-lg border ${
              completeness >= 80
                ? "bg-emerald-50/80 border-emerald-100"
                : "bg-primary/5 border-primary/10"
            }`}
          >
            <BiCheckCircle
              className={
                completeness >= 80 ? "text-emerald-600" : "text-primary"
              }
              size={20}
            />
            <div>
              <p className="text-sm font-bold text-slate-800">
                {completeness >= 80
                  ? "High reliability"
                  : completeness >= 50
                    ? "Keep going"
                    : "Complete your profile"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {completeness >= 80
                  ? "Your account meets platform trust standards for clinical workflows."
                  : "Add missing details to unlock the full DigiHealth experience."}
              </p>
            </div>
          </div>
        </div>

        {/* Account snapshot */}
        <div className="px-5 pb-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            Account snapshot
          </p>
          <ul className="space-y-2.5">
            {accountFacts.map((f) => (
              <li
                key={f.label}
                className="flex items-start gap-2.5 text-sm"
              >
                <span className="mt-0.5 text-slate-400 shrink-0">
                  {f.icon || <BiBadgeCheck size={14} />}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {f.label}
                  </p>
                  <p className="font-semibold text-slate-700 truncate">
                    {f.value}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {tips.length > 0 && (
          <div className="mx-5 mb-5 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Next steps
            </p>
            <ul className="space-y-1.5">
              {tips.map((t) => (
                <li
                  key={t}
                  className="text-xs text-slate-600 flex items-start gap-2"
                >
                  <span className="text-primary mt-0.5">•</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Support */}
      <div className="rounded-lg overflow-hidden bg-gradient-to-br from-[#1a4d66] via-primary to-[#53CBF3] p-6 text-white shadow-lg shadow-primary/20">
        <div className="w-11 h-11 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center mb-4">
          <BiSupport size={22} />
        </div>
        <h3 className="text-lg font-bold font-grotesk mb-1.5">
          Need assistance?
        </h3>
        <p className="text-sm text-white/80 mb-5 leading-relaxed">
          Our support team can help with identity verification, clinical
          configuration, or billing questions.
        </p>
        <Button
          variant="white"
          fullWidth
          className="!h-11 !rounded-lg !text-sm !font-bold !text-primary !max-w-none normal-case"
          onClick={() =>
            setToast({
              message: "Assistance request sent to support.",
              type: "success",
            })
          }
        >
          Contact support
        </Button>
      </div>
    </aside>
  );
}

export {
  BiUser,
  BiFile,
  BiBell,
  BiShieldQuarter,
  BiLockAlt,
  BiEnvelope,
  BiPhone,
};
