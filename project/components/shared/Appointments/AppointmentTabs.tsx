"use client";

import React from "react";
import {
  BiCalendar,
  BiCalendarEvent,
  BiCalendarEdit,
  BiCalendarCheck,
  BiCalendarExclamation,
  BiCalendarX,
  BiCalendarPlus,
  BiGridAlt,
} from "react-icons/bi";
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
    label1: string;
    label2: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    bgColor: string;
    iconColor: string;
    /** Highlight requests so they stand out in the strip */
    emphasize?: boolean;
  }
> = {
  all: {
    label1: "All",
    label2: "Appointments",
    icon: BiGridAlt,
    bgColor: "#d6e8f4",
    iconColor: "text-purple-600",
  },
  requests: {
    label1: "Requests",
    label2: "Requests",
    icon: BiCalendarPlus,
    bgColor: "#fef3c7",
    iconColor: "text-amber-700",
    emphasize: true,
  },
  upcoming: {
    label1: "Upcoming",
    label2: "Appointments",
    icon: BiCalendarEvent,
    bgColor: "#d6e8f4",
    iconColor: "text-yellow-600",
  },
  ongoing: {
    label1: "Ongoing",
    label2: "Appointments",
    icon: BiCalendarEdit,
    bgColor: "#d6e8f4",
    iconColor: "text-green-600",
  },
  past: {
    label1: "Completed",
    label2: "Appointments",
    icon: BiCalendarCheck,
    bgColor: "#d6e8f4",
    iconColor: "text-blue-600",
  },
  missed: {
    label1: "Missed",
    label2: "Appointments",
    icon: BiCalendarExclamation,
    bgColor: "#d6e8f4",
    iconColor: "text-orange-500",
  },
  cancelled: {
    label1: "Cancelled",
    label2: "Appointments",
    icon: BiCalendarX,
    bgColor: "#d6e8f4",
    iconColor: "text-red-500",
  },
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
      {/* Mobile Dropdown — same order (Requests near top) */}
      <div className="md:hidden pb-4">
        <Select
          value={activeTab}
          onChange={(val) => onChange(val as AppointmentTab)}
          options={tabs.map((t) => ({
            value: t,
            label: `${tabConfig[t].label1} ${tabConfig[t].label2} (${counts[t] ?? 0})`,
          }))}
          icon={<BiCalendar className="text-slate-500 text-lg" />}
        />
      </div>

      {/* Desktop: compact cards so all tabs fit without assuming horizontal scroll */}
      <div className="hidden md:grid grid-cols-4 xl:grid-cols-7 gap-2 pb-4 w-full">
        {tabs.map((t) => {
          const config = tabConfig[t];
          const Icon = config.icon;
          const count = counts[t] ?? 0;
          const isActive = activeTab === t;
          const hasItems = count > 0 && t === "requests";

          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={`flex items-center bg-white gap-2 cursor-pointer px-4 py-6 rounded-md transition-all ease-in-out duration-200 min-w-0 text-left border ${
                isActive
                  ? "border-slate-500 opacity-100 "
                  : config.emphasize
                    ? "border-slate-200 opacity-95 hover:opacity-100 hover:border-amber-300"
                    : "border-slate-200 opacity-85 hover:opacity-100 hover:scale-[1.01]"
              }`}
              
            >
              <Icon
                className={`text-primary shrink-0`}
                size={20}
              />
              <div className="flex items-end space-x-1 min-w-0 flex-1">
                <span className="text-lg font-bold text-slate-900 leading-none tabular-nums flex items-center gap-1.5">
                  {count}
                  {hasItems && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                      title="Pending requests"
                    />
                  )}
                </span>
                <span className="text-xs font-medium text-slate-600 leading-tight mt-0.5 truncate">
                  {config.label1} 
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
