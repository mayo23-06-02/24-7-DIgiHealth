"use client";

import React, { useState } from "react";
import {
  BiSearch,
  BiX,
  BiCalendar,
  BiFilter,
  BiSortDown,
  BiSortUp,
} from "react-icons/bi";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

interface Props {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  dateFrom: string;
  onDateFromChange: (val: string) => void;
  dateTo: string;
  onDateToChange: (val: string) => void;
  sortBy: string;
  onSortChange: (val: string) => void;
  onClearDates: () => void;
}

export default function AppointmentFilters({
  searchQuery,
  onSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  sortBy,
  onSortChange,
  typeFilter,
  onTypeFilterChange,
  onClearDates,
}: Props & {
  typeFilter?: string;
  onTypeFilterChange?: (val: string) => void;
}) {
  const [showFilterModal, setShowFilterModal] = useState(false);

  const hasActiveFilters =
    dateFrom || dateTo || (typeFilter && typeFilter !== "all");

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <BiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={16}
          />
          <input
            type="text"
            placeholder="Search patient name or fields..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 p-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Filter & Sort Icons (All screens) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center justify-center  rounded-lg px-2  p-2  text-slate-500 cursor-pointer hover:text-slate-800 outline-none relative"
          >
            <BiFilter size={24} />
            {hasActiveFilters && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
            )}
          </button>
          <button
            onClick={() =>
              onSortChange(sortBy === "newest" ? "oldest" : "newest")
            }
            className="flex items-center justify-center  rounded-lg px-2  p-2  text-slate-500 cursor-pointer hover:text-slate-800 outline-none"
          >
            {sortBy === "newest" ? (
              <BiSortDown size={24} />
            ) : (
              <BiSortUp size={24} />
            )}
          </button>
        </div>
      </div>

      <Modal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filters"
      >
        <div className="flex flex-col gap-6">
          {onTypeFilterChange && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">
                Appointment Type
              </label>
              <Select
                value={typeFilter || "all"}
                onChange={(v) => onTypeFilterChange(v)}
                options={[
                  { value: "all", label: "All Types" },
                  { value: "video", label: "Video" },
                  { value: "chat", label: "Chat" },
                ]}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">
              Start Date
            </label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-3 bg-white">
              <BiCalendar className="text-slate-500 shrink-0" size={18} />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="w-full text-base outline-none text-slate-700 font-medium [&::-webkit-calendar-picker-indicator]:hidden bg-transparent cursor-text"
                onClick={(e) =>
                  (e.target as HTMLInputElement).showPicker &&
                  (e.target as HTMLInputElement).showPicker()
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">End Date</label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-3 bg-white">
              <BiCalendar className="text-slate-500 shrink-0" size={18} />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="w-full text-base outline-none text-slate-700 font-medium [&::-webkit-calendar-picker-indicator]:hidden bg-transparent cursor-text"
                onClick={(e) =>
                  (e.target as HTMLInputElement).showPicker &&
                  (e.target as HTMLInputElement).showPicker()
                }
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                onClearDates();
                if (onTypeFilterChange) onTypeFilterChange("all");
                setShowFilterModal(false);
              }}
              className="mt-2 flex items-center justify-center gap-1 w-full px-4 py-3 text-sm font-bold text-red-500 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <BiX size={18} /> Clear Filters
            </button>
          )}

          <button
            onClick={() => setShowFilterModal(false)}
            className="w-full px-4 py-3 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </Modal>
    </>
  );
}
