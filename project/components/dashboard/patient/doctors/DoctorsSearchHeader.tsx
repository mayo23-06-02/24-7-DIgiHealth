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
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <div className="flex-1 w-full">
        <Input
          type="text"
          placeholder="Search doctors, specializations, or conditions..."
          icon={<Search size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenFilter}
          aria-label="Filter"
          className={`relative flex items-center justify-center w-11 h-11 rounded-lg transition-colors ${hasActiveFilters ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          <SlidersHorizontal size={18} />
          {hasActiveFilters && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-danger-500 rounded-full border-2 border-white" />
          )}
        </button>
        <button
          onClick={onOpenSort}
          aria-label="Sort"
          className="flex items-center justify-center w-11 h-11 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <ArrowUpDown size={18} />
        </button>
      </div>
    </div>
  );
}
