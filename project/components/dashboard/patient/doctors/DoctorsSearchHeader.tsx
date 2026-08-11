import React from "react";
import Input from "@/components/ui/Input";
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";

interface DoctorsSearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onOpenFilter: () => void;
  onOpenSort: () => void;
  hasActiveFilters: boolean;
}

export default function DoctorsSearchHeader({
  searchQuery,
  setSearchQuery,
  onOpenFilter,
  onOpenSort,
  hasActiveFilters,
}: DoctorsSearchHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
      <div className="flex-1 w-full min-w-0">
        <Input
          type="text"
          placeholder="Search doctors, conditions..."
          aria-label="Search doctors"
          icon={<Search size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="flex items-center gap-2 sm:gap-2 shrink-0">
        <button
          onClick={onOpenFilter}
          aria-label="Filter practitioners"
          title="Filter"
          className={`relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg transition-colors flex-shrink-0 ${hasActiveFilters ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          <SlidersHorizontal size={18} />
          {hasActiveFilters && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-danger-500 rounded-full border-2 border-white" />
          )}
        </button>
        <button
          onClick={onOpenSort}
          aria-label="Sort practitioners"
          title="Sort"
          className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
        >
          <ArrowUpDown size={18} />
        </button>
      </div>
    </div>
  );
}
