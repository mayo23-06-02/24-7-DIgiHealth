"use client";

import React from "react";
import { Calendar } from "lucide-react";
import Select from "@/components/ui/Select";

export type AppointmentTab =
  | "all"
  | "requests"
  | "upcoming"
  | "ongoing"
  | "past"
  | "missed"
  | "cancelled";

/**
 * Requests sit right after All so pending items stay visible without scrolling.
 */
export const ALL_TABS: AppointmentTab[] = [
  "all",
  "requests",
  "upcoming",
  "ongoing",
  "past",
  "missed",
  "cancelled",
];

const tabConfig: Record<
  AppointmentTab,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  all: { label: "All", badgeBg: "bg-primary", badgeText: "text-white" },
  requests: { label: "Requests", badgeBg: "bg-warning-500", badgeText: "text-warning-50" },
  upcoming: { label: "Upcoming", badgeBg: "bg-primary", badgeText: "text-white" },
  ongoing: { label: "Ongoing", badgeBg: "bg-success-500", badgeText: "text-success-50" },
  past: { label: "Completed", badgeBg: "bg-info-500", badgeText: "text-info-50" },
  missed: { label: "Missed", badgeBg: "bg-warning-500", badgeText: "text-warning-50" },
  cancelled: { label: "Cancelled", badgeBg: "bg-danger-500", badgeText: "text-danger-50" },
};

interface AppointmentTabsProps {
  activeTab: AppointmentTab;
  onChange: (tab: AppointmentTab) => void;
  counts: Partial<Record<AppointmentTab, number>>;
  tabs?: AppointmentTab[];
}

export default function AppointmentTabs({
  activeTab,
  onChange,
  counts,
  tabs = ALL_TABS,
}: AppointmentTabsProps) {
  return (
    <>
      {/* Mobile Dropdown */}
      <div className="sm:hidden pb-4">
        <Select
          value={activeTab}
          onChange={(val) => onChange(val as AppointmentTab)}
          options={tabs.map((t) => ({
            value: t,
            label: `${tabConfig[t].label} (${counts[t] ?? 0})`,
          }))}
          icon={<Calendar size={18} className="text-ink-600" />}
        />
      </div>

      {/* Desktop: Underline Tab Design (Design System Pattern) */}
      <div className="hidden sm:flex gap-1 border-b border-border overflow-x-auto no-scrollbar pb-0">
        {tabs.map((t) => {
          const config = tabConfig[t];
          const count = counts[t] ?? 0;
          const isActive = activeTab === t;

          return (
            <button
              key={t}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(t)}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-sm font-semibold
                whitespace-nowrap transition-colors
                ${
                  isActive
                    ? "text-primary"
                    : "text-ink-600 hover:text-ink-900"
                }
              `}
            >
              <span>{config.label}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${config.badgeBg} ${config.badgeText}`}>
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
