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
  | "upcoming"
  | "ongoing"
  | "past"
  | "missed"
  | "cancelled"
  | "requests";

export const ALL_TABS: AppointmentTab[] = [
  "all",
  "upcoming",
  "ongoing",
  "past",
  "missed",
  "cancelled",
  "requests",
];

const tabConfig: Record<
  AppointmentTab,
  {
    label1: string;
    label2: string;
    icon: React.ElementType;
    bgColor: string;
    iconColor: string;
  }
> = {
  all: {
    label1: "All",
    label2: "Appointments",
    icon: BiGridAlt,
    bgColor: "#d6e8f4",
    iconColor: "text-purple-600",
  },
  upcoming: {
    label1: "Upcoming",
    label2: "Appointments",
    icon: BiCalendarEvent,
    bgColor: "#fef9e7",
    iconColor: "text-yellow-600",
  },
  ongoing: {
    label1: "Ongoing",
    label2: "Appointments",
    icon: BiCalendarEdit,
    bgColor: "#e8f5e9",
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
    bgColor: "#fff3e0",
    iconColor: "text-orange-500",
  },
  cancelled: {
    label1: "Cancelled",
    label2: "Appointments",
    icon: BiCalendarX,
    bgColor: "#fdecea",
    iconColor: "text-red-500",
  },
  requests: {
    label1: "Appointment",
    label2: "Requests",
    icon: BiCalendarPlus,
    bgColor: "#fef9e7",
    iconColor: "text-yellow-700",
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
      {/* Mobile Dropdown */}
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

      {/* Desktop Card Tabs */}
      <div className="hidden md:flex gap-2 overflow-x-auto custom-scrollbar pb-4 w-full">
        {tabs.map((t) => {
          const config = tabConfig[t];
          const Icon = config.icon;
          return (
            <button
              key={t}
              onClick={() => onChange(t)}
              className={`flex items-center gap-3 cursor-pointer px-4 py-4 rounded-lg transition-all ease-in-out duration-300 min-w-[180px] text-left border-2 ${
                activeTab === t
                  ? "border-gray-400 opacity-100"
                  : "border-transparent opacity-80 hover:opacity-100 hover:scale-[1.02]"
              }`}
              style={{ backgroundColor: config.bgColor }}
            >
              <Icon className={`${config.iconColor} text-2xl shrink-0`} />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900 leading-none">
                  {counts[t] ?? 0}
                </span>
                <span className="text-xs font-medium text-slate-600 leading-tight mt-0.5">
                  {config.label1}
                  <br />
                  {config.label2}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
