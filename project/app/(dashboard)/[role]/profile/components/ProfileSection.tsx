"use client";

import React from "react";

const COLOR_MAP: Record<string, string> = {
  primary: "bg-primary-50 text-primary ring-primary/10",
  rose: "bg-danger-50 text-danger-700 ring-danger-500/10",
  emerald: "bg-success-50 text-success-700 ring-success-500/10",
  blue: "bg-info-50 text-info-700 ring-info-500/10",
  amber: "bg-warning-50 text-warning-700 ring-warning-500/10",
  violet: "bg-violet-500/10 text-violet-600 ring-violet-500/10",
  slate: "bg-surface-soft text-ink-600 ring-border",
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
            COLOR_MAP.primary
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-base lg:text-h3 font-semibold text-ink-900 font-grotesk tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="text-xs lg:text-sm text-slate-500 mt-0.5 leading-relaxed">
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
      className={`rounded-lg border border-slate-200 bg-white overflow-hidden ${className}`}
    >
      <div className="px-5 sm:px-7 py-5 border-b border-slate-200 ">
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
