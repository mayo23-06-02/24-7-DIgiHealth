"use client";

import React from "react";

const COLOR_MAP: Record<string, string> = {
  primary: "bg-primary/10 text-primary ring-primary/10",
  rose: "bg-rose-500/10 text-rose-600 ring-rose-500/10",
  emerald: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/10",
  blue: "bg-sky-500/10 text-sky-600 ring-sky-500/10",
  amber: "bg-amber-500/10 text-amber-600 ring-amber-500/10",
  violet: "bg-violet-500/10 text-violet-600 ring-violet-500/10",
  slate: "bg-slate-100 text-slate-600 ring-slate-200/60",
};

interface ProfileSectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  color?: keyof typeof COLOR_MAP | string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bare?: boolean;
}

export function ProfileSectionHead({
  icon,
  title,
  description,
  color = "primary",
  action,
}: Omit<ProfileSectionProps, "children" | "className" | "bare">) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="flex items-start gap-4 min-w-0">
        <div
          className={`w-12 h-12 shrink-0 rounded-lg flex items-center justify-center ring-1 ${
            COLOR_MAP[color] || COLOR_MAP.primary
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-lg font-bold text-slate-800 font-grotesk tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default function ProfileSection({
  icon,
  title,
  description,
  color = "primary",
  action,
  children,
  className = "",
  bare = false,
}: ProfileSectionProps) {
  if (bare) {
    return (
      <div className={`space-y-6 ${className}`}>
        <ProfileSectionHead
          icon={icon}
          title={title}
          description={description}
          color={color}
          action={action}
        />
        {children}
      </div>
    );
  }

  return (
    <section
      className={`rounded-lg border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40 overflow-hidden ${className}`}
    >
      <div className="px-5 sm:px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <ProfileSectionHead
          icon={icon}
          title={title}
          description={description}
          color={color}
          action={action}
        />
      </div>
      <div className="p-5 sm:p-7">{children}</div>
    </section>
  );
}
