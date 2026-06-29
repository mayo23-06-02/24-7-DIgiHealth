import React from "react";
import { BiSearch, BiX, BiCalendar } from "react-icons/bi";
import Select from "@/components/ui/Select";

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
  onClearDates,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[220px]">
        <BiSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          size={16}
        />
        <input
          type="text"
          placeholder="Search patient name or fields..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary"
        />
      </div>
      <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white">
        <BiCalendar className="text-slate-500" size={15} />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="text-sm outline-none text-slate-700 font-medium"
        />
      </div>
      <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white">
        <BiCalendar className="text-slate-500" size={15} />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="text-sm outline-none text-slate-700 font-medium"
        />
      </div>
      <Select
        value={sortBy}
        onChange={(v) => onSortChange(v)}
        options={[
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
        ]}
        className="w-36"
      />
      {(dateFrom || dateTo) && (
        <button
          onClick={onClearDates}
          className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <BiX size={14} /> Clear
        </button>
      )}
    </div>
  );
}
