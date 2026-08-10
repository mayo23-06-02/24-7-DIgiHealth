"use client";

import React from "react";
import { CheckCircle2, LifeBuoy, BadgeCheck } from "lucide-react";
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
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden sticky top-20">
        <div className="px-5 py-4 border-b border-slate-200 bg-surface-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Profile health
              </p>
              <p className="text-sm font-bold text-ink-900 mt-0.5">
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
                  stroke="#F1F5F9"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={
                    completeness >= 80
                      ? "#10b981"
                      : completeness >= 50
                        ? "#4493b8"
                        : "#f59e0b"
                  }
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(completeness / 100) * 94.2} 94.2`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-ink-900 tabular-nums">
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
                <span className="text-sm font-bold text-ink-900 tabular-nums">
                  {item.value}%
                </span>
              </div>
              <div className="h-2 w-full bg-surface-soft rounded-full overflow-hidden">
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
                ? "bg-success-50 border-success-500/20"
                : "bg-primary/5 border-primary/10"
            }`}
          >
            <CheckCircle2
              className={
                completeness >= 80 ? "text-success-500" : "text-primary"
              }
              size={20}
            />
            <div>
              <p className="text-sm font-bold text-ink-900">
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
                  {f.icon || <BadgeCheck size={14} />}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {f.label}
                  </p>
                  <p className="font-semibold text-ink-900 truncate">
                    {f.value}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {tips.length > 0 && (
          <div className="mx-5 mb-5 p-3.5 rounded-lg bg-surface-soft border border-slate-200">
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
      <div className="rounded-lg overflow-hidden bg-gradient-to-br from-[#1a4d66] via-primary to-[#53CBF3] p-6 text-white">
        <div className="w-11 h-11 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center mb-4">
          <LifeBuoy size={22} />
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
