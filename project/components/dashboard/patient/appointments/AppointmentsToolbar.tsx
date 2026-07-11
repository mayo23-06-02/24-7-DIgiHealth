"use client";

import React from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { BiCalendar, BiListUl, BiSearch } from "react-icons/bi";
import type { AppointmentStatus, ViewType } from "./types";

const TABS: AppointmentStatus[] = [
  "all",
  "upcoming",
  "ongoing",
  "past",
  "missed",
  "cancelled",
];

interface AppointmentsToolbarProps {
  activeTab: AppointmentStatus;
  viewType: ViewType;
  searchQuery: string;
  sortBy: string;
  counts: Record<string, { total: number; new: number }>;
  onTabChange: (tab: AppointmentStatus) => void;
  onSearchChange: (v: string) => void;
  onSortChange: (v: string) => void;
  onViewTypeChange: (v: ViewType) => void;
}

export default function AppointmentsToolbar({
  activeTab,
  viewType,
  searchQuery,
  sortBy,
  counts,
  onTabChange,
  onSearchChange,
  onSortChange,
  onViewTypeChange,
}: AppointmentsToolbarProps) {
  return (
    <Card className="flex flex-col gap-4 border border-slate-100 sticky top-0 z-30 p-3">
      <div className="flex gap-1.5 bg-slate-50 rounded-lg p-1 overflow-x-auto custom-scrollbar">
        {TABS.map((tab) => (
          <Button
            key={tab}
            onClick={() => onTabChange(tab)}
            variant={activeTab === tab ? "primary" : "ghost"}
            className={`px-4 py-2 h-auto text-xs lg:telg font-bold tracking-normal rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === tab
                ? "shadow-primary/20"
                : "text-slate-500 hover:text-slate-600"
            }`}
          >
            {tab}
            <span
              className={`ml-1 px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                activeTab === tab
                  ? "bg-white/20 border-white/20 text-white"
                  : "bg-white border-slate-100 text-slate-500"
              }`}
            >
              {counts[tab]?.total || 0}
            </span>
            {counts[tab]?.new > 0 && (
              <span className="ml-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </Button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex flex-1 flex-wrap gap-2 items-center">
          <div className="hidden sm:flex flex-1 min-w-[140px]">
            <Input
              type="text"
              placeholder="Search all fields..."
              icon={<BiSearch size={18} />}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="hidden md:flex flex-wrap gap-2 items-center">
            <Select
              value={sortBy}
              onChange={(v) => onSortChange(v)}
              options={[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
              ]}
              className="w-36"
            />
          </div>
          <div className="hidden sm:flex p-1.5 bg-slate-100 rounded-lg border border-slate-200/50 self-start sm:self-auto">
            <Button
              variant="ghost"
              onClick={() => onViewTypeChange("list")}
              className={`w-10 h-10 p-0 rounded-lg border-none min-w-0! transition-all ${
                viewType === "list"
                  ? "bg-white shadow-none text-primary"
                  : "text-slate-500 hover:text-slate-600"
              }`}
            >
              <BiListUl size={20} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => onViewTypeChange("calendar")}
              className={`w-10 h-10 p-0 rounded-lg border-none min-w-0! transition-all ${
                viewType === "calendar"
                  ? "bg-white shadow-none text-primary"
                  : "text-slate-500 hover:text-slate-600"
              }`}
            >
              <BiCalendar size={20} />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
